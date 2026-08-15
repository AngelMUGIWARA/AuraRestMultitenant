import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Exige un JWT válido firmado con SYSTEM_JWT_SECRET (estrategia 'system-jwt').
 * Nunca acepta un JWT de tenant — son estrategias/secretos distintos, por lo
 * que este guard por sí solo garantiza el aislamiento entre Super Admin y
 * usuarios de cualquier restaurante.
 */
@Injectable()
export class SystemJwtAuthGuard extends AuthGuard('system-jwt') {}
