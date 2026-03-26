import { Modalidad } from '../entities/modalidad.entity';

export interface IModalidadRepository {
  create(data: Partial<Modalidad>): Promise<Modalidad>;
  findAll(): Promise<Modalidad[]>;
  findById(id: string): Promise<Modalidad | null>;
  save(modalidad: Modalidad): Promise<Modalidad>;
  remove(modalidad: Modalidad): Promise<void>;
}

export const MODALIDAD_REPOSITORY_PORT = 'MODALIDAD_REPOSITORY_PORT';