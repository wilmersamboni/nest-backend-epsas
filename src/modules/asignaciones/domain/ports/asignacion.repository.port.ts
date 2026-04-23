import { Asignacion } from '../entities/asignacion.entity';

export interface IAsignacionRepository {
  create(data: Partial<Asignacion> & { etapa: { id: string } }): Promise<Asignacion>;
  findAll(): Promise<Asignacion[]>;
  findById(id: string): Promise<Asignacion | null>;
  findByEtapaId(etapaId: string): Promise<Asignacion[]>;
  save(asignacion: Asignacion): Promise<Asignacion>;
  deleteById(id: string): Promise<number>;
}

export const ASIGNACION_REPOSITORY_PORT = 'ASIGNACION_REPOSITORY_PORT';