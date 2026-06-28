import { EtapaPractica } from '../entities/etapa_practica.entity';

export interface CreateEtapaPracticaData {
  matriculaId: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  observacion?: string;
  empresa: { id: string };
  modalidad: { id: string };
}

export interface IEtapaPracticaRepository {
  create(data: CreateEtapaPracticaData): Promise<EtapaPractica>;
  findAll(): Promise<EtapaPractica[]>;
  findById(id: string): Promise<EtapaPractica | null>;
  findByIdWithRelations(id: string): Promise<EtapaPractica | null>;
  save(etapa: EtapaPractica): Promise<EtapaPractica>;
  deleteById(id: string): Promise<number>;
  updateObservacion(id: string, observacion: string): Promise<void>;
  updateAvance(id: string, avance: number): Promise<void>;
  updateEstado(id: string, estado: string): Promise<void>;
  findByMatriculaId(matriculaId: string): Promise<EtapaPractica | null>;
}

export const ETAPA_PRACTICA_REPOSITORY_PORT = 'ETAPA_PRACTICA_REPOSITORY_PORT';