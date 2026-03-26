import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY, AppRole } from '../decorators/roles.decorator';
import { RequestContextService } from '../rls/request-context';

@Injectable()
export class RlsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // 1. Endpoint público → pasa sin validar
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Debe haber usuario en el contexto
    const user = RequestContextService.getUser();
    if (!user) {
      throw new UnauthorizedException('No se encontró sesión válida');
    }

    // 3. Si el endpoint tiene @Roles(), validar
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!requiredRoles.includes(user.rol as AppRole)) {
      throw new ForbiddenException(
        `Rol '${user.rol}' no tiene permiso para este recurso`,
      );
    }

    return true;
  }
}
