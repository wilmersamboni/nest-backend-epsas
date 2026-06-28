import { Controller, Post, Get, Delete, Param, Body,
         UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import type { Response } from 'express';
import { DocumentosService } from '../../application/documento-practica.service';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { EtapaParamsDto, DocumentoParamsDto } from './dto/params-documento.dto';
import { ResponseDocumentoDto } from './dto/response-documento.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { Documento } from '../../domain/entities/documento-practica.entity';

@Controller('etapas-practicas/:etapaId/documentos')
export class DocumentosController {

  constructor(private readonly documentosService: DocumentosService) {}

  private toResponse(doc: Documento): ResponseDocumentoDto {
    const r = new ResponseDocumentoDto();
    r.id              = doc.id;
    r.etapaId         = doc.etapaId;
    r.nombre_original = doc.nombre_original;
    r.tipo_mime       = doc.tipo_mime;
    r.tamanio         = doc.tamanio;
    r.creado_en       = doc.creado_en;
    return r;
  }

  @Post()
  @Roles('admin', 'docente')
  @UseInterceptors(FilesInterceptor('archivos', 20, {
    storage: diskStorage({
      destination: './uploads/documentos',
      filename: (req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const permitidos = /^\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg|zip)$/;
      cb(null, permitidos.test(extname(file.originalname).toLowerCase()));
    },
  }))
  async subir(
    @Param() params: EtapaParamsDto,
    @Body() _body: UploadDocumentoDto,
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    const docs = await this.documentosService.guardarDocumentos(params.etapaId, archivos);
    return docs.map((d) => this.toResponse(d));
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  async listar(@Param() params: EtapaParamsDto) {
    const docs = await this.documentosService.listarPorEtapa(params.etapaId);
    return docs.map((d) => this.toResponse(d));
  }

  @Get(':documentoId/descargar')
  @Roles('admin', 'docente', 'estudiante')
  async descargar(
    @Param() params: DocumentoParamsDto,
    @Res() res: Response,
  ) {
    const doc = await this.documentosService.obtener(params.documentoId);
    const fullPath = join(process.cwd(), doc.ruta);
    res.download(fullPath, doc.nombre_original);
  }

  @Delete(':documentoId')
  @Roles('admin', 'docente')
  eliminar(@Param() params: DocumentoParamsDto) {
    return this.documentosService.eliminar(params.documentoId);
  }
}
