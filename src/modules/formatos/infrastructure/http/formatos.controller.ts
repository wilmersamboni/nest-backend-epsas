import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FormatosService } from '../../application/formatos.service';
import { CreateFormatoDto } from './dto/create-formato.dto';
import { UpdateFormatoDto } from './dto/update-formato.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads/formatos',
    filename: (_req: any, file: Express.Multer.File, cb: any) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Tipo de archivo no permitido. Se aceptan PDF, imágenes y documentos Word.',
        ),
        false,
      );
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
};

@Controller('formatos')
export class FormatosController {
  constructor(private readonly formatosService: FormatosService) {}

  // ── POST /formatos  (multipart/form-data) ──────────────────────────
  @Post()
  @Roles('admin', 'docente', 'docente')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  create(
    @Body() dto: CreateFormatoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Debes adjuntar un archivo');
    return this.formatosService.create(dto, file);
  }

  // ── GET /formatos  ─────────────────────────────────────────────────
  @Get()
  @Roles('admin', 'docente', 'docente', 'estudiante')
  findAll() {
    return this.formatosService.findAll();
  }

  // ── GET /formatos/etapa/:etapaId?tipo=contrato ─────────────────────
  @Get('etapa/:etapaId')
  @Roles('admin', 'docente', 'docente', 'estudiante')
  findByEtapa(
    @Param('etapaId', ParseUUIDPipe) etapaId: string,
    @Query('tipo') tipo?: string,
  ) {
    if (tipo) return this.formatosService.findByTipo(etapaId, tipo);
    return this.formatosService.findByEtapa(etapaId);
  }

  // ── GET /formatos/:id ──────────────────────────────────────────────
  @Get(':id')
  @Roles('admin', 'docente', 'docente', 'estudiante')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.formatosService.findOne(id);
  }

  // ── PATCH /formatos/:id ────────────────────────────────────────────
  @Patch(':id')
  @Roles('admin', 'docente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormatoDto,
  ) {
    return this.formatosService.update(id, dto);
  }

  // ── PATCH /formatos/:id/estado ─────────────────────────────────────
  @Patch(':id/estado')
  @Roles('admin', 'docente')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: string,
  ) {
    return this.formatosService.cambiarEstado(id, estado);
  }

  // ── DELETE /formatos/:id ───────────────────────────────────────────
  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.formatosService.remove(id);
  }
}
