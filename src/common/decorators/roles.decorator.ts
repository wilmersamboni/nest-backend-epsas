import { SetMetadata } from '@nestjs/common';

export type AppRole = 'admin' | 'docente' | 'estudiante';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

/** Restringe el endpoint a uno o más roles. Ej: @Roles('admin', 'docente') */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/** Marca el endpoint como público (no requiere token). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
