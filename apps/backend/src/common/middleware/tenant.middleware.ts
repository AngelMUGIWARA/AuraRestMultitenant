import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';

/**
 * Resuelve el tenant en cada petición usando tres estrategias en orden:
 *   1. JWT payload (tenantSchemaName ya viene en el token)
 *   2. Header x-tenant-slug
 *   3. Subdominio del host (restaurante1.sistema.com)
 *
 * Escribe request.tenant con los datos del Tenant de la BD.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // 1. Intentar resolver desde el JWT (más eficiente, evita query a BD)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwt.verify(authHeader.slice(7));
        if (payload?.tenantSchemaName) {
          req['tenant'] = {
            schemaName: payload.tenantSchemaName,
            slug: payload.tenantSlug,
          };
          return next();
        }
      } catch {
        // Token inválido o expirado — continúa con otras estrategias
      }
    }

    // 2. Header explícito x-tenant-slug
    const slugFromHeader = req.headers['x-tenant-slug'] as string | undefined;

    // 3. Subdominio del host
    const slugFromHost = this.extractSubdomain(req.hostname);

    const slug = slugFromHeader ?? slugFromHost;

    if (slug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
      if (tenant) {
        req['tenant'] = tenant;
      }
    }

    next();
  }

  private extractSubdomain(hostname: string): string | undefined {
    const ignored = ['localhost', 'api', 'www'];
    const parts = hostname.split('.');
    const sub = parts[0];
    return parts.length > 1 && !ignored.includes(sub) ? sub : undefined;
  }
}
