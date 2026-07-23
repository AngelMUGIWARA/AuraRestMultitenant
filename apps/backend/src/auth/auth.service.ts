import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { VoiceSeedDto } from './dto/voice-seed.dto';
import { VoiceLoginDto } from './dto/voice-login.dto';
import { VoiceLoginResponseDto } from './dto/voice-login-response.dto';

const VOICE_ROLES = ['OWNER', 'ADMIN'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly dummyVoiceHash = bcrypt.hashSync(
    'dummy-seed-word-placeholder',
    Number(process.env.BCRYPT_ROUNDS ?? 10),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwt: JwtService,
  ) {}

  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateJti(): string {
    return randomBytes(16).toString('hex');
  }

  private generateFamilyId(): string {
    return randomBytes(16).toString('hex');
  }

  private getRefreshExpiry(): Date {
    const days = Number(process.env.JWT_REFRESH_EXPIRES_IN?.replace(/\D/g, '') ?? '7');
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    return expires;
  }

  /* ── Login ───────────────────────────────────────────────────── */

  async login(dto: LoginDto, tenantSchemaName: string): Promise<AuthResponseDto> {
    const db = this.tenantPrisma.getClient(tenantSchemaName);

    const user = await db.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario inactivo o suspendido');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { schemaName: tenantSchemaName },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role as string,
      tenantSlug: tenant?.slug ?? '',
      tenantSchemaName,
    };

    return this.createSessionAndTokens(user, payload);
  }

  /* ── Refresh ─────────────────────────────────────────────────── */

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { sub, tenantSchemaName, jti, familyId } = payload as {
      sub: string;
      tenantSchemaName: string;
      jti: string;
      familyId: string;
    };

    if (!tenantSchemaName || !jti) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const session = await this.prisma.refreshSession.findUnique({
      where: { jti },
    });

    if (!session) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokenHash = AuthService.hashToken(refreshToken);
    if (session.tokenHash !== tokenHash) {
      if (familyId) await this.revokeFamily(familyId).catch(() => {});
      this.logger.warn('Replay detectado');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (session.revokedAt) {
      if (familyId) await this.revokeFamily(familyId).catch(() => {});
      this.logger.warn('Reutilizacion detectada');
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const db = this.tenantPrisma.getClient(tenantSchemaName);
    const user = await db.user.findUnique({ where: { id: sub } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { schemaName: tenantSchemaName },
    });

    const newPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as string,
      tenantSlug: tenant?.slug ?? '',
      tenantSchemaName,
    };

    const newJti = this.generateJti();
    const newFamilyId = familyId || this.generateFamilyId();
    const newRefreshToken = this.jwt.sign(
      { ...newPayload, jti: newJti, familyId: newFamilyId },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
      },
    );
    const accessToken = this.jwt.sign(newPayload);
    const newTokenHash = AuthService.hashToken(newRefreshToken);
    const newExpiresAt = this.getRefreshExpiry();

    const newSession = await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshSession.create({
        data: {
          userId: user.id,
          tenantSchemaName,
          tokenHash: newTokenHash,
          jti: newJti,
          familyId: newFamilyId,
          expiresAt: newExpiresAt,
        },
      });

      await tx.refreshSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedBySessionId: created.id,
        },
      });

      return created;
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  /* ── Logout ──────────────────────────────────────────────────── */

  async logout(refreshToken: string): Promise<{ message: string }> {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as Record<string, unknown>;
    } catch {
      return { message: 'Sesion cerrada exitosamente' };
    }

    const { jti } = payload as { jti: string };
    if (!jti) return { message: 'Sesion cerrada exitosamente' };

    await this.prisma.refreshSession
      .updateMany({
        where: { jti, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});

    return { message: 'Sesion cerrada exitosamente' };
  }

  /* ── Voice Seed ──────────────────────────────────────────────── */

  async setVoiceSeed(
    userId: string,
    tenantSchemaName: string,
    dto: VoiceSeedDto,
  ): Promise<{ voiceUsername: string }> {
    const db = this.tenantPrisma.getClient(tenantSchemaName);
    const voiceUsername = dto.voiceUsername.toLowerCase();

    const existing = await db.user.findUnique({
      where: { voiceUsername },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'Ese nombre de voz ya esta en uso por otro usuario',
      );
    }

    const voiceSeedHash = await bcrypt.hash(
      dto.seedWord,
      Number(process.env.BCRYPT_ROUNDS ?? 10),
    );

    await db.user.update({
      where: { id: userId },
      data: { voiceUsername, voiceSeedHash },
    });

    return { voiceUsername };
  }

  /* ── Voice Login ─────────────────────────────────────────────── */

  async voiceLogin(
    dto: VoiceLoginDto,
    tenantSchemaName: string,
  ): Promise<VoiceLoginResponseDto> {
    const db = this.tenantPrisma.getClient(tenantSchemaName);
    const invalid: VoiceLoginResponseDto = { valid: false };

    const user = await db.user.findUnique({
      where: { voiceUsername: dto.voiceUsername.toLowerCase() },
    });

    if (!user || !user.voiceSeedHash) {
      await bcrypt.compare(dto.seedWord, this.dummyVoiceHash);
      return invalid;
    }

    const matches = await bcrypt.compare(dto.seedWord, user.voiceSeedHash);
    if (!matches) return invalid;

    if (!VOICE_ROLES.includes(user.role) || user.status !== 'ACTIVE') {
      return invalid;
    }

    return { valid: true, name: user.name, role: user.role };
  }

  /* ── Internal helpers ────────────────────────────────────────── */

  private async createSessionAndTokens(
    user: { id: string; name: string; email: string; role: string },
    payload: Record<string, unknown>,
  ): Promise<AuthResponseDto> {
    const jti = this.generateJti();
    const familyId = this.generateFamilyId();
    const tenantSchemaName = payload.tenantSchemaName as string;

    const refreshToken = this.jwt.sign(
      { ...payload, jti, familyId },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
      },
    );
    const accessToken = this.jwt.sign(payload);
    const tokenHash = AuthService.hashToken(refreshToken);
    const expiresAt = this.getRefreshExpiry();

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tenantSchemaName,
        tokenHash,
        jti,
        familyId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
