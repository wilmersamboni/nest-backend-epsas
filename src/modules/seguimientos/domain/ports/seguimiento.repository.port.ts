import { Seguimiento } from '../entities/seguimiento.entity';

export interface ISeguimientoRepository {
  create(data: Partial<Seguimiento> & { etapa: { id: string }; asignacion?: { id: string } }): Promise<Seguimiento>;
  findAll(): Promise<Seguimiento[]>;
  findById(id: string): Promise<Seguimiento | null>;
  save(seguimiento: Seguimiento): Promise<Seguimiento>;
  updateEstado(id: string, estado: string): Promise<void>;
  updateActas(id: string, filename: string): Promise<void>;
  remove(seguimiento: Seguimiento): Promise<void>;
  findByMatriculaIds(ids: string[]): Promise<Seguimiento[]>;
  findByEtapaId(etapaId: string): Promise<Seguimiento[]>;
}

export const SEGUIMIENTO_REPOSITORY_PORT = 'SEGUIMIENTO_REPOSITORY_PORT';
