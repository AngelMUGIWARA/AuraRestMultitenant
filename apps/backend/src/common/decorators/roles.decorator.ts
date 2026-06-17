import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restringe el endpoint a los roles especificados */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
