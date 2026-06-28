import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Roles } from '../decorators/roles.decorator';

const ALLOWED_FOLDERS = new Set(['bitacoras', 'actas', 'observaciones', 'documentos', 'formatos']);

@Controller('uploads')
export class UploadsController {
  @Get(':folder/:filename')
  @Roles('admin', 'docente', 'estudiante')
  serveFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Evitar path traversal: solo carpetas conocidas y sin separadores
    const safeFolder = path.basename(folder);
    const safeFile = path.basename(filename);

    if (!ALLOWED_FOLDERS.has(safeFolder)) {
      throw new NotFoundException('Recurso no encontrado');
    }

    const filePath = path.join(process.cwd(), 'uploads', safeFolder, safeFile);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    res.sendFile(filePath);
  }
}
