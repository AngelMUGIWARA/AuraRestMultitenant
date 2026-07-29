import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { SystemAdminLoginDto } from './dto/system-admin-login.dto';
import { SystemAdminAuthResponseDto } from './dto/system-admin-auth-response.dto';

@Injectable()
export class SystemAdminAuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.refreshSecret = this.config.getOrThrow<string>('SYSTEM_JWT_REFRESH_SECRET');
    this.refreshExpiresIn = this.config.get<string>('SYSTEM_JWT_REFRESH_EXPIRES_IN', '30d');
  }

  async login(dto: SystemAdminLoginDto): Promise<SystemAdminAuthResponseDto> {
    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (!superAdmin) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, superAdmin.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    if (superAdmin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Cuenta de Super Admin inactiva');
    }

    return this.issueTokens(superAdmin);
  }

  async refreshToken(refreshToken: string): Promise<SystemAdminAuthResponseDto> {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id: payload.sub } });
    if (!superAdmin || superAdmin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(superAdmin);
  }

  /**
   * A diferencia del refresh de tenant (auth/auth.service.ts), este flujo es
   * stateless: no persiste sesiones ni detecta reuso de tokens. Aceptable
   * para un panel interno con un puñado de operadores de plataforma; si el
   * número de Super Admins crece, replicar el esquema RefreshSession.
   */
  private issueTokens(superAdmin: {
    id: string;
    name: string;
    email: string;
    status: string;
  }): SystemAdminAuthResponseDto {
    const payload = { sub: superAdmin.id, email: superAdmin.email, role: 'SUPER_ADMIN' as const };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as any,
    });

    return {
      accessToken,
      refreshToken,
      superAdmin: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'SUPER_ADMIN',
      },
    };
  }
}
