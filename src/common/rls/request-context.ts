import { AsyncLocalStorage } from 'async_hooks';

export interface RequestUser {
  sub: string;
  rol: string;
  centroId: string;
  sedeId?: string;
  personaId?: string;
  matriculaIds?: string[];
  rawToken: string; // ← nuevo
}

export interface RequestContext {
  user: RequestUser | null;
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
};