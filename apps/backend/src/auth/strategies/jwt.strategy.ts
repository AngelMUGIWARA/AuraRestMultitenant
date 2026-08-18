import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TenantPrismaService } from '../../database/tenant-prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  branchId?: string;
  tenantSlug: string;
  tenantSchemaName: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Valida el payload JWT y verifica que el usuario exista y esté activo
   * en la BD del tenant. Un token válido no garantiza acceso si el usuario
   * fue eliminado o desactivado después de emitir el token.
   */
  async validate(payload: JwtPayload) {
    const db = this.tenantPrisma.getClient(payload.tenantSchemaName);
    const user = await db.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuario inactivo o suspendido');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      branchId: payload.branchId,
      tenantSlug: payload.tenantSlug,
      tenantSchemaName: payload.tenantSchemaName,
    };
  }
}
