import { Observacion } from '../entities/observacion.entity';

export interface IObservacionRepository {
  create(data: any): Promise<Observacion>;
  findAll(): Promise<Observacion[]>;
  findById(id: string): Promise<Observacion | null>;
  findByEtapaId(etapaId: string): Promise<Observacion[]>;
  findBySeguimientoId(seguimientoId: string): Promise<Observacion[]>;
  save(o: Observacion): Promise<Observacion>;
  deleteById(id: string): Promise<number>;
}

export const OBSERVACION_REPOSITORY_PORT = 'OBSERVACION_REPOSITORY_PORT';