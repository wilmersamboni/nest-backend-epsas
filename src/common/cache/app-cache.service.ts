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
    const user = RequestContextService.getUser();
    const centroId = user?.centroId ?? 'anon';
    // Invalida para todos los roles del centro
    await Promise.all([
      this.cache.del(`${resource}:${centroId}:admin`),
      this.cache.del(`${resource}:${centroId}:docente`),
      this.cache.del(`${resource}:${user?.sub}`), // estudiante
    ]);
  }
}