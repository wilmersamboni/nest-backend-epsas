// domain/ports/documento.repository.port.ts
import { Documento } from '../entities/documento-practica.entity';

export interface IDocumentoRepository {
  guardarVarios(documentos: Partial<Documento>[]): Promise<Documento[]>;
  findByEtapaId(etapaId: string): Promise<Documento[]>;
  findById(id: string): Promise<Documento | null>;
  deleteById(id: string): Promise<void>;
}

export const DOCUMENTO_REPOSITORY_PORT = 'DOCUMENTO_REPOSITORY_PORT';