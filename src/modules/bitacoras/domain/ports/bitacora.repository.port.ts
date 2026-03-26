import { Bitacora } from '../entities/bitacora.entity';

export interface IBitacoraRepository {
  create(data: Partial<Bitacora> & { seguimiento: { id: string } }): Promise<Bitacora>;
  findAll(): Promise<Bitacora[]>;
  findById(id: string): Promise<Bitacora | null>;
  save(bitacora: Bitacora): Promise<Bitacora>;
  deleteById(id: string): Promise<number>;
}

export const BITACORA_REPOSITORY_PORT = 'BITACORA_REPOSITORY_PORT';