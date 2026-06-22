// infrastructure/adapters/documento.typeorm.repository.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IDocumentoRepository } from '../../domain/ports/documento-practica.repository';
import { Documento } from '../../domain/entities/documento-practica.entity';
import { DocumentoOrmEntity } from '../entities/documento-practica.orm-entity';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class DocumentoTypeOrmRepository implements IDocumentoRepository {

  constructor() {}

  private get orm(): Repository<DocumentoOrmEntity> {
    return RequestContextService.getDataSource().getRepository(DocumentoOrmEntity);
  }

  async guardarVarios(documentos: Partial<Documento>[]): Promise<Documento[]> {
    const entidades = this.orm.create(documentos as any[]);
    const saved = await this.orm.save(entidades);
    return saved.map(this.toDomain);
  }

  async findByEtapaId(etapaId: string): Promise<Documento[]> {
    const lista = await this.orm.find({
      where: { etapaId },
      order: { creado_en: 'DESC' },
    });
    return lista.map(this.toDomain);
  }

  async findById(id: string): Promise<Documento | null> {
    const doc = await this.orm.findOne({ where: { id } });
    return doc ? this.toDomain(doc) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.orm.delete(id);
  }

  private toDomain(e: DocumentoOrmEntity): Documento {
    const d = new Documento();
    d.id             = e.id;
    d.etapaId        = e.etapaId;
    d.nombre_original = e.nombre_original;
    d.nombre_archivo  = e.nombre_archivo;
    d.ruta           = e.ruta;
    d.tipo_mime      = e.tipo_mime;
    d.tamanio        = e.tamanio;
    d.creado_en      = e.creado_en;
    return d;
  }
}