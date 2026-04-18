import { EtapaPractica } from '../entities/etapa_practica.entity';

export interface IEtapaPracticaRepository {
  create(data: any): Promise<EtapaPractica>;
  findAll(): Promise<EtapaPractica[]>;
  findById(id: string): Promise<EtapaPractica | null>;
  findByIdWithRelations(id: string): Promise<EtapaPractica | null>;
  save(etapa: EtapaPractica): Promise<EtapaPractica>;
  deleteById(id: string): Promise<number>;
  updateObservacion(id: string, observacion: string): Promise<void>;
  updateAvance(id: string, avance: number): Promise<void>;
  findByMatriculaId(matriculaId: string): Promise<EtapaPractica | null>;
}

export const ETAPA_PRACTICA_REPOSITORY_PORT = 'ETAPA_PRACTICA_REPOSITORY_PORT';