import { Formato } from '../entities/formato.entity';

export const FORMATO_REPOSITORY_PORT = 'FORMATO_REPOSITORY_PORT';

export interface IFormatoRepository {
  create(data: Partial<Formato>): Promise<Formato>;
  findAll(): Promise<Formato[]>;
  findById(id: string): Promise<Formato | null>;
  findByEtapaId(etapaId: string): Promise<Formato[]>;
  findByTipo(etapaId: string, tipo: string): Promise<Formato[]>;
  save(formato: Partial<Formato>): Promise<Formato>;
  deleteById(id: string): Promise<number>;
  updateEstado(id: string, estado: string): Promise<void>;
}
