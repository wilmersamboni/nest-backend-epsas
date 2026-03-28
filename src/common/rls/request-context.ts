import { AsyncLocalStorage } from 'async_hooks';

export interface RequestUser {
  sub: string;        // id_persona del ERP
  rol: string;        // 'administrador' | 'instructor' | 'aprendiz'
  centroId: string;   // id_centro_formacion — viene del header X-Centro-ID
  sedeId?: string;    // id_sede — opcional, si necesitas granularidad de sede
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
};