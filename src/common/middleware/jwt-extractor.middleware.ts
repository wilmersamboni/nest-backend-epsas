import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { RequestContextService } from '../rls/request-context';
import { EpsasDataSourceFactory } from '../../database/epsas-datasource.factory';

export interface RequestUser {
  sub: string;
  rol: string;
  centroId: string;
  rawToken: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

@Injectable()
export class JwtExtractorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtExtractorMiddleware.name);

  constructor(private readonly epsasFactory: EpsasDataSourceFactory) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // ── 1. Extraer slug (x-tenant header o subdominio) ────────────────────────
    const slug = this.resolveSlug(req);

    // Token crudo disponible antes del decode — se reusa en step 2 para
    // autenticar la llamada al ERP (GET /admin/tenants/slug/:slug).
    const earlyToken: string | undefined =
      req.cookies?.token ??
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    // ── 2. Resolver DataSource del tenant ─────────────────────────────────────
    let dataSource: DataSource | undefined;
    if (slug) {
      try {
        dataSource = await this.epsasFactory.getDataSource(slug, earlyToken);
      } catch (err) {
        if (err instanceof NotFoundException || err instanceof BadRequestException) {
          res.status(404).json({ message: `Tenant no encontrado: ${slug}` });
          return;
        }
        this.logger.error(`Error al conectar con el tenant '${slug}': ${(err as Error).message}`);
        res.status(503).json({ message: 'Error al conectar con la base de datos del tenant' });
        return;
      }
    }

    // ── 3. Decodificar JWT ────────────────────────────────────────────────────
    const raw =
      req.cookies?.token ||
      req.headers.authorization?.split(' ')[1];

    const decoded = raw ? this.decode(raw) : null;
    // El factory tiene el UUID real del CentroFormacion (resuelto del ERP).
    // El header X-Centro-ID es fallback para compatibilidad o cuando no hay slug.
    const centroId =
      (slug ? this.epsasFactory.getCentroId(slug) : undefined) ??
      (req.headers['x-centro-id'] as string | undefined) ??
      undefined;
    const sedeId   = req.headers['x-sede-id']   as string | undefined;
    const cargo    = req.headers['x-cargo']      as string | undefined;

    const cargoMap: Record<string, string> = {
      administrador:     'admin',
      administrador_erp: 'admin',
      instructor:        'docente',
      aprendiz:          'estudiante',
    };

    const user =
      decoded && centroId
        ? {
            ...decoded,
            centroId,
            sedeId,
            rawToken: raw ?? '',
            rol: cargoMap[cargo ?? ''] ?? decoded.rol,
          }
        : null;

    // DEBUG TEMPORAL — eliminar después
    if (user?.rol === 'estudiante') {
      this.logger.log(
        `[RLS-DEBUG] rol=estudiante sub=${user.sub} personaId=${user.personaId} matriculaIds=${JSON.stringify(user.matriculaIds)}`,
      );
    }

    // ── 4. Almacenar contexto completo en AsyncLocalStorage ───────────────────
    RequestContextService.run({ user, slug: slug ?? undefined, dataSource }, () => next());
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private resolveSlug(req: Request): string | null {
    const xTenant = req.headers['x-tenant'];
    if (typeof xTenant === 'string' && xTenant.trim()) {
      return xTenant.trim().toLowerCase();
    }
    const hostname = req.hostname ?? '';
    if (!hostname || LOCAL_HOSTS.has(hostname)) return null;
    const parts = hostname.split('.');
    if (parts.length >= 2) return parts[0].toLowerCase();
    return null;
  }

  private decode(token: string) {
    try {
      const [, payloadB64] = token.split('.');
      const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(json);

      const cargoMap: Record<string, string> = {
        administrador:     'admin',
        administrador_erp: 'admin',
        instructor:        'docente',
        aprendiz:          'estudiante',
      };

      const cargoRaw = payload.cargo ?? '';

      return {
        sub: String(payload.idUsuario ?? payload.sub ?? payload.id),
        rol: cargoMap[cargoRaw] ?? 'desconocido',
        personaId: payload.personaId ? String(payload.personaId) : undefined,
        matriculaIds: Array.isArray(payload.matriculaIds)
          ? (payload.matriculaIds as string[])
          : undefined,
      };
    } catch (e) {
      this.logger.warn('JWT no decodificable: ' + (e as Error).message);
      return null;
    }
  }
}
