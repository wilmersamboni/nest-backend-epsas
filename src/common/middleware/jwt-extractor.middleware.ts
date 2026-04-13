import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../rls/request-context';

export interface RequestUser {
  sub: string;
  rol: string;
  centroId: string;
  rawToken: string; // ← nuevo
}



@Injectable()
export class JwtExtractorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtExtractorMiddleware.name);

  

  use(req: Request, _res: Response, next: NextFunction) {
  const raw =
    req.cookies?.token ||
    req.headers.authorization?.split(' ')[1];

  const decoded = raw ? this.decode(raw) : null;
  const centroId = req.headers['x-centro-id'] as string | undefined;
  const sedeId   = req.headers['x-sede-id']   as string | undefined;
  const cargo    = req.headers['x-cargo']     as string | undefined; // ← nuevo

  const cargoMap: Record<string, string> = {
    administrador: 'admin',
    instructor:    'docente',
    aprendiz:      'estudiante',
  };

  const user =
    decoded && centroId
      ? {
          ...decoded,
          centroId,
          sedeId,
          rawToken: raw ?? '',
          rol: cargoMap[cargo ?? ''] ?? decoded.rol, // ← usa el cargo del header
        }
      : null;

  RequestContextService.run({ user }, () => next());
}

  private decode(token: string) {
  try {
    const [, payloadB64] = token.split('.');
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(json);

    const cargoMap: Record<string, string> = {
      administrador: 'admin',
      instructor:    'docente',
      aprendiz:      'estudiante',
    };

    const cargoRaw = payload.cargo ?? '';

    return {
      sub: String(payload.idUsuario ?? payload.sub ?? payload.id),
      rol: cargoMap[cargoRaw] ?? 'desconocido',
    };
  } catch (e) {
    this.logger.warn('JWT no decodificable: ' + (e as Error).message);
    return null;
  }
}
}

// import * as jwt from 'jsonwebtoken';
// const payload = jwt.verify(token, process.env.JWT_SECRET);