import { Seguimiento } from '../entities/seguimiento.entity';

export interface ISeguimientoRepository {
  create(data: Partial<Seguimiento> & { etapa: { id: string }; asignacion?: { id: string } }): Promise<Seguimiento>;
  findAll(): Promise<Seguimiento[]>;
  findById(id: string): Promise<Seguimiento | null>;
  save(seguimiento: Seguimiento): Promise<Seguimiento>;
  remove(seguimiento: Seguimiento): Promise<void>;
  findByMatriculaIds(ids: string[]): Promise<Seguimiento[]>;
}

export const SEGUIMIENTO_REPOSITORY_PORT = 'SEGUIMIENTO_REPOSITORY_PORT';
