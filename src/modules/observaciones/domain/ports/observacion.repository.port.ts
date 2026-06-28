import { Observacion } from '../entities/observacion.entity';

export interface CreateObservacionData {
  fecha: Date;
  descripcion: string;
  evidencia_foto?: string;
  persona: string;
  seguimiento: { id: string };
}

export interface IObservacionRepository {
  create(data: CreateObservacionData): Promise<Observacion>;
  findAll(): Promise<Observacion[]>;
  findById(id: string): Promise<Observacion | null>;
  findByEtapaId(etapaId: string): Promise<Observacion[]>;
  findBySeguimientoId(seguimientoId: string): Promise<Observacion[]>;
  save(o: Observacion): Promise<Observacion>;
  deleteById(id: string): Promise<number>;
}

export const OBSERVACION_REPOSITORY_PORT = 'OBSERVACION_REPOSITORY_PORT';
