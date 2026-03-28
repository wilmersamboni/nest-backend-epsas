import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../rls/request-context';

@Injectable()
export class JwtExtractorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtExtractorMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const raw =
      req.cookies?.token ||
      req.headers.authorization?.split(' ')[1];

    const decoded = raw ? this.decode(raw) : null;

    // Leer el centro/sede del header — lo manda el frontend
    const centroId = req.headers['x-centro-id'] as string | undefined;
    const sedeId   = req.headers['x-sede-id']   as string | undefined;

    const user =
      decoded && centroId
        ? { ...decoded, centroId, sedeId }
        : null;

    if (!user) {
      this.logger.warn(
        `Request sin contexto completo — decoded:${!!decoded} centroId:${centroId}`,
      );
    }

    RequestContextService.run({ user }, () => next());
  }

  private decode(token: string) {
    try {
      const [, payloadB64] = token.split('.');
      const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(json);

      // Mapear cargos del ERP a roles de este backend
      const cargoMap: Record<string, string> = {
        administrador: 'admin',
        instructor:    'docente',
        aprendiz:      'estudiante',
      };

      const cargoRaw = payload.cargo ?? payload.rol ?? payload.role ?? '';

      return {
        sub: String(payload.sub ?? payload.id_persona ?? payload.id),
        rol: cargoMap[cargoRaw] ?? cargoRaw,
      };
    } catch (e) {
      this.logger.warn('JWT no decodificable: ' + (e as Error).message);
      return null;
    }
  }
}

// import * as jwt from 'jsonwebtoken';
// const payload = jwt.verify(token, process.env.JWT_SECRET);