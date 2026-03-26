import { Empresa } from '../entities/empresa.entity';

export interface IEmpresaRepository {
  create(empresa: Partial<Empresa>): Promise<Empresa>;
  findAll(): Promise<Empresa[]>;
  findById(id: string): Promise<Empresa | null>;
  save(empresa: Empresa): Promise<Empresa>;
  remove(empresa: Empresa): Promise<void>;
}

export const EMPRESA_REPOSITORY_PORT = 'EMPRESA_REPOSITORY_PORT';
