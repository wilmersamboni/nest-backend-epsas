import { Empresa } from '../entities/empresa.entity';

export interface EmpresaRepositoryPort {
  create(data: Partial<Empresa>): Empresa;

  save(empresa: Empresa): Promise<Empresa>;

  findAll(): Promise<Empresa[]>;

  findById(id: string): Promise<Empresa | null>;

  remove(empresa: Empresa): Promise<void>;
}