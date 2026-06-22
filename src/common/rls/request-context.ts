import { AsyncLocalStorage } from 'async_hooks';
import { InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface RequestUser {
  sub: string;
  rol: string;
  centroId: string;
  sedeId?: string;
  personaId?: string;
  matriculaIds?: string[];
  rawToken: string;
}

export interface RequestContext {
  user: RequestUser | null;
  slug?: string;
  dataSource?: DataSource;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const RequestContextService = {
  run<T>(ctx: RequestContext, fn: () => T): T {
    return storage.run(ctx, fn);
  },

  get(): RequestContext | undefined {
    return storage.getStore();
  },

  getUser(): RequestUser | null {
    return storage.getStore()?.user ?? null;
  },

  getCentroId(): string | null {
    return storage.getStore()?.user?.centroId ?? null;
  },

  getSedeId(): string | null {
    return storage.getStore()?.user?.sedeId ?? null;
  },

  getRawToken(): string | null {
    return storage.getStore()?.user?.rawToken ?? null;
  },

  getSlug(): string {
    const slug = storage.getStore()?.slug;
    if (!slug) {
      throw new InternalServerErrorException(
        'No hay contexto de tenant activo: getSlug() llamado fuera del ciclo de request',
      );
    }
    return slug;
  },

  getDataSource(): DataSource {
    const ds = storage.getStore()?.dataSource;
    if (!ds) {
      throw new InternalServerErrorException(
        'No hay DataSource de tenant activo: getDataSource() llamado fuera del ciclo de request',
      );
    }
    return ds;
  },

  hasContext(): boolean {
    return storage.getStore() !== undefined;
  },

  hasDataSource(): boolean {
    return storage.getStore()?.dataSource !== undefined;
  },
};
