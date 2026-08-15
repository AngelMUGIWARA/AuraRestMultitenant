import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedSystemAdmin {
  id: string;
  email: string;
  role: 'SUPER_ADMIN';
}

/** Extrae el Super Admin autenticado del JWT de sistema (request.user) */
export const CurrentSystemAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedSystemAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
