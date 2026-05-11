// application/documentos.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IDocumentoRepository } from '../domain/ports/documento-practica.repository';
import { DOCUMENTO_REPOSITORY_PORT } from '../domain/ports/documento-practica.repository';
import { unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DocumentosService {

  constructor(
    @Inject(DOCUMENTO_REPOSITORY_PORT)
    private readonly repo: IDocumentoRepository,
  ) {}

  async guardarDocumentos(etapaId: string, archivos: Express.Multer.File[]) {
    const datos = archivos.map(f => ({
      etapaId,
      nombre_original: f.originalname,
      nombre_archivo:  f.filename,
      ruta:            `uploads/documentos/${f.filename}`,
      tipo_mime:       f.mimetype,
      tamanio:         f.size,
    }));
    return this.repo.guardarVarios(datos);
  }

  listarPorEtapa(etapaId: string) {
    return this.repo.findByEtapaId(etapaId);
  }

  async obtener(id: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async eliminar(id: string) {
    const doc = await this.obtener(id);
    try { unlinkSync(join(process.cwd(), doc.ruta)); } catch {}
    await this.repo.deleteById(id);
  }
}