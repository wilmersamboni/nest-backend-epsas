import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type  { Cache } from 'cache-manager';
import { RequestContextService } from '../rls/request-context';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  // Genera una key única por tenant + rol + recurso
  private buildKey(resource: string, suffix?: string): string {
    const user = RequestContextService.getUser();
    const centroId = user?.centroId ?? 'anon';
    const rol      = user?.rol      ?? 'anon';
    const sub      = user?.sub      ?? 'anon';

    // Admin e instructor: caché por centro + rol
    // Aprendiz: caché individual por sub (cada uno ve datos distintos)
    const scope = rol === 'estudiante' ? sub : `${centroId}:${rol}`;
    return `${resource}:${scope}${suffix ? ':' + suffix : ''}`;
  }

  async get<T>(resource: string, suffix?: string): Promise<T | null> {
    try {
      const key = this.buildKey(resource, suffix);
      return await this.cache.get<T>(key) ?? null;
    } catch {
      return null;
    }
  }

  async set(resource: string, value: any, suffix?: string, ttl?: number): Promise<void> {
    try {
      const key = this.buildKey(resource, suffix);
      // TTL reducido a 30 s para minimizar el impacto de fallos de invalidación
      await this.cache.set(key, value, ttl ?? 30_000);
    } catch {
      /* store no disponible → no cachear, la BD responde */
    }
  }

  // Invalida todo lo relacionado a un recurso en el centro actual
  async invalidate(resource: string): Promise<void> {
    const user     = RequestContextService.getUser();
    const centroId = user?.centroId ?? 'anon';
    const prefix   = `${resource}:${centroId}`;

    // ── Rama 1: Redis ───────────────────────────────────────────────────────
    try {
      const store       = (this.cache as any).stores?.[0] ?? (this.cache as any).store;
      const redisClient = store?.client;
      if (redisClient) {
        const keysToDelete: string[] = [];
        let cursor = '0';
        do {
          const [nextCursor, keys]: [string, string[]] =
            await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
          cursor = nextCursor;
          keysToDelete.push(...keys);
        } while (cursor !== '0');

        if (keysToDelete.length > 0) await redisClient.del(keysToDelete);
        return;
      }
    } catch { /* no es Redis */ }

    // ── Rama 2: store en memoria con keys() ─────────────────────────────────
    try {
      const memStore  = (this.cache as any).stores?.[0] ?? (this.cache as any).store;
      const storeKeys: string[] = await (memStore as any)?.keys?.() ?? [];
      const matches = storeKeys.filter((k: string) => k.startsWith(prefix));
      if (matches.length > 0) {
        await Promise.all(matches.map((k) => this.cache.del(k)));
      }
      return;
    } catch { /* store no expone keys() */ }

    // ── Rama 3: borrar patrones conocidos por rol ───────────────────────────
    try {
      const roles    = ['admin', 'docente', 'instructor', 'estudiante'];
      const suffixes = ['', ':rel:', ':matricula:'];
      const deletes: Promise<any>[] = [];

      for (const r of roles) {
        // clave sin sufijo (findAll)
        deletes.push(this.cache.del(`${resource}:${centroId}:${r}`));
        // claves con sufijos conocidos (cobertura amplia sin conocer los IDs exactos)
        for (const s of suffixes.slice(1)) {
          // Intentar borrar la clave raíz del sufijo si existiera sin ID
          deletes.push(this.cache.del(`${resource}:${centroId}:${r}${s}`));
        }
      }
      if (user?.sub) deletes.push(this.cache.del(`${resource}:${user.sub}`));
      await Promise.all(deletes);
    } catch { /* ignorar */ }

    // ── Rama 4 (nuclear): reset completo del caché ──────────────────────────
    // Solo se llega aquí si las ramas anteriores no funcionaron.
    // reset() limpia todas las entradas; es seguro porque el caché es temporal.
    try {
      const resetFn = (this.cache as any).reset ?? (this.cache as any).clear;
      if (typeof resetFn === 'function') {
        await resetFn.call(this.cache);
        this.logger.debug(`Cache reset completo tras invalidación de '${resource}'`);
      }
    } catch { /* no hay reset disponible; el TTL de 30 s garantiza datos frescos */ }
  }
}
