import { Controller, Post, Get, Delete, Param, Body,
         UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import type { Response } from 'express';
import { DocumentosService } from '../../application/documento-practica.service';
import { UploadDocumentoDto } from './dto/upload-documento.dto';
import { EtapaParamsDto, DocumentoParamsDto } from './dto/params-documento.dto';

@Controller('etapas-practicas/:etapaId/documentos')
export class DocumentosController {

  constructor(private readonly documentosService: DocumentosService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('archivos', 20, {
    storage: diskStorage({
      destination: './uploads/documentos',
      filename: (req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const permitidos = /pdf|doc|docx|xls|xlsx|png|jpg|jpeg|zip/;
      cb(null, permitidos.test(extname(file.originalname).toLowerCase()));
    },
  }))
  async subir(
    @Param() params: EtapaParamsDto,          // ← valida que etapaId sea UUID
    @Body() body: UploadDocumentoDto,         // ← descripcion opcional
    @UploadedFiles() archivos: Express.Multer.File[],
  ) {
    return this.documentosService.guardarDocumentos(params.etapaId, archivos);
  }

  @Get()
  listar(@Param() params: EtapaParamsDto) {
    return this.documentosService.listarPorEtapa(params.etapaId);
  }

  @Get(':documentoId/descargar')
async descargar(
  @Param() params: DocumentoParamsDto,
  @Res() res: Response,
) {
  const doc = await this.documentosService.obtener(params.documentoId);

  const fullPath = `${process.cwd()}/${doc.ruta}`;

  console.log('PATH:', fullPath);

  res.download(fullPath, doc.nombre_original);
}

  @Delete(':documentoId')
  eliminar(@Param() params: DocumentoParamsDto) {
    return this.documentosService.eliminar(params.documentoId);
  }
}