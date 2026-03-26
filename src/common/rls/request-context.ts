import { AsyncLocalStorage } from 'async_hooks';

export interface RequestUser {
  sub: string;  // ID del usuario en el ERP principal
  rol: string;  // 'admin' | 'docente' | 'estudiante'
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
};
