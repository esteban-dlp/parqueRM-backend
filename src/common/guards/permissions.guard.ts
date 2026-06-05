import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../interfaces/api-response.interface';
import { ResponseCodes } from '../constants/response-codes';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException({
        code: ResponseCodes.AUTH_INSUFFICIENT_PERMISSIONS,
        message: 'Debes iniciar sesión para realizar esta acción.',
      });
    }

    const has = required.every((p) => user.permissions.includes(p));

    if (!has) {
      throw new ForbiddenException({
        code: ResponseCodes.AUTH_INSUFFICIENT_PERMISSIONS,
        message: 'No tienes permiso para realizar esta acción.',
        errors: { required, granted: user.permissions },
      });
    }

    return true;
  }
}
