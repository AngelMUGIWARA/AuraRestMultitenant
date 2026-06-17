import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Verifica que TenantMiddleware haya resuelto el tenant.
 * Úsalo en módulos que requieran contexto de tenant.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.tenant) {
      throw new UnauthorizedException(
        'Tenant no identificado. Incluye el header x-tenant-slug o usa un subdominio válido.',
      );
    }
    return true;
  }
}
