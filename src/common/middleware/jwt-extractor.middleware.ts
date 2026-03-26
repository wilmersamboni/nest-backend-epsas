import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../rls/request-context';

/**
 * Decodifica el JWT que llega del ERP principal (cookie `token` o header Authorization).
 * No verifica la firma — confía en que el ERP ya lo validó.
 *
 * Para verificar firma en el futuro:
 *   npm i @nestjs/jwt
 *   jwtService.verify(token, { secret: process.env.JWT_SECRET })
 */
@Injectable()
export class JwtExtractorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtExtractorMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const raw =
      req.cookies?.token ||
      req.headers.authorization?.split(' ')[1];

    const user = raw ? this.decode(raw) : null;

    RequestContextService.run({ user }, () => next());
  }

  private decode(token: string) {
    try {
      const [, payloadB64] = token.split('.');
      const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(json);

      return {
        sub: payload.sub ?? payload.userId ?? payload.id,
        rol: payload.rol ?? payload.role ?? 'desconocido',
      };
    } catch (e) {
      this.logger.warn('JWT no decodificable: ' + (e as Error).message);
      return null;
    }
  }
}
