import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type  { Cache } from 'cache-manager';
import { RequestContextService } from '../rls/request-context';

@Injectable()
export class AppCacheService {

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
    const key = this.buildKey(resource, suffix);
    return await this.cache.get<T>(key) ?? null;
  }

  async set(resource: string, value: any, suffix?: string, ttl?: number): Promise<void> {
    const key = this.buildKey(resource, suffix);
    await this.cache.set(key, value, ttl ?? 300000); // 5 min en ms
  }

  // Invalida todo lo relacionado a un recurso en el centro actual
  async invalidate(resource: string): Promise<void> {
    const user     = RequestContextService.getUser();
    const centroId = user?.centroId ?? 'anon';
    const prefix   = `${resource}:${centroId}`;

    // ── Rama 1: Redis ───────────────────────────────────────────────────────
    try {
      const store      = (this.cache as any).stores?.[0] ?? (this.cache as any).store;
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

        if (keysToDelete.length > 0) {
          await redisClient.del(keysToDelete);
        }
        return;
      }
    } catch { /* no es Redis, continuar */ }

    // ── Rama 2: store en memoria con keys() ─────────────────────────────────
    // cache-manager almacena las claves en el store; si expone keys() podemos
    // filtrar y borrar exactamente las que empiezan con el prefijo del tenant.
    try {
      const memStore = (this.cache as any).stores?.[0] ?? (this.cache as any).store;
      const storeKeys: string[] =
        await (memStore as any)?.keys?.() ?? [];
      const matches = storeKeys.filter((k: string) => k.startsWith(prefix));
      if (matches.length > 0) {
        await Promise.all(matches.map((k) => this.cache.del(k)));
      }
      return;
    } catch { /* store no expone keys(), usar último recurso */ }

    // ── Rama 3: último recurso — borrar patrones conocidos ──────────────────
    const roles = ['admin', 'docente', 'instructor', 'estudiante'];
    await Promise.all([
      ...roles.map((r) => this.cache.del(`${resource}:${centroId}:${r}`)),
      this.cache.del(`${resource}:${user?.sub ?? 'anon'}`),
    ]);
  }
}