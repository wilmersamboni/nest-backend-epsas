import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UploadedFile, 
  UseInterceptors,
  BadRequestException,
 
} from '@nestjs/common';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ObservacionesService } from '../../application/observaciones.service';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Post('upload/evidencia')
  @Roles('admin', 'docente')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/observaciones',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp)$/i;
        cb(null, allowed.test(file.originalname));
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  uploadEvidencia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo inválido o no enviado');
    // Devuelve la URL pública que ServeStaticModule ya expone en /uploads/...
    return { url: `/uploads/observaciones/${file.filename}` };
  }

  @Post()
  @Roles('admin', 'docente')
  create(@Body() dto: CreateObservacioneDto) {
    return this.observacionesService.create(dto);
  }

  /** Crea una observación en el seguimiento más reciente de la etapa */
  @Post('etapa/:etapaId')
  @Roles('admin', 'docente')
  createParaEtapa(
    @Param('etapaId', ParseUUIDPipe) etapaId: string,
    @Body() body: { descripcion: string; persona: string; fecha: string },
  ) {
    return this.observacionesService.createParaEtapa(etapaId, body);
  }

  /** Lista todas las observaciones de todos los seguimientos de una etapa */
  @Get('etapa/:etapaId')
  @Roles('admin', 'docente', 'estudiante')
  findByEtapa(@Param('etapaId', ParseUUIDPipe) etapaId: string) {
    return this.observacionesService.findByEtapa(etapaId);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll() {
    return this.observacionesService.findAll();
  }


    @Get('seguimiento/:seguimientoId')
@Roles('admin', 'docente', 'estudiante')
findBySeguimiento(
  @Param('seguimientoId', ParseUUIDPipe) seguimientoId: string
) {
  return this.observacionesService.findBySeguimiento(seguimientoId);
}

  @Get(':id')
  @Roles('admin', 'docente', 'estudiante')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.observacionesService.findOne(id);
  }



  @Patch(':id')
  @Roles('admin', 'docente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateObservacioneDto,
  ) {
    return this.observacionesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.observacionesService.remove(id);
  }
}
