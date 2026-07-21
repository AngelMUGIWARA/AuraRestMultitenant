import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  // Hash dummy precalculado en el arranque del proceso: se usa para comparar
  // contra él cuando el voiceUsername no existe, así el tiempo de respuesta
  // no revela si el usuario existe o no.
  private readonly dummyVoiceHash = bcrypt.hashSync(
    'dummy-seed-word-placeholder',
    Number(process.env.BCRYPT_ROUNDS ?? 10),
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto, tenantSchemaName: string): Promise<AuthResponseDto> {
    const db = this.tenantPrisma.getClient(tenantSchemaName);

    const user = await db.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario inactivo o suspendido');
    }

    // Obtener el slug del tenant a partir del schemaName
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

    return this.buildAuthResponse(user, payload);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const { sub, email, role, tenantSchemaName } = payload as {
      sub: string;
      email: string;
      role: string;
      tenantSchemaName: string;
    };

    if (!tenantSchemaName) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const db = this.tenantPrisma.getClient(tenantSchemaName);
    const user = await db.user.findUnique({ where: { id: sub } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Usuario inactivo o suspendido');

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

    return this.buildAuthResponse(user, newPayload);
  }

  async logout(): Promise<{ message: string }> {
    return { message: 'Sesión cerrada exitosamente' };
  }

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
        'Ese nombre de voz ya está en uso por otro usuario',
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

  private buildAuthResponse(
    user: { id: string; name: string; email: string; role: string },
    payload: Record<string, unknown>,
  ): AuthResponseDto {
    return {
      accessToken: this.jwt.sign(payload),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
      }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
