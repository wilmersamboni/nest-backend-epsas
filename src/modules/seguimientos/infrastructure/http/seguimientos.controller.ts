import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SeguimientosService } from '../../application/seguimientos.service';
import { CreateSeguimientoDto } from './dto/create-seguimiento.dto';
import { UpdateSeguimientoDto } from './dto/update-seguimiento.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('seguimientos')
export class SeguimientosController {
  constructor(private readonly seguimientosService: SeguimientosService) {}

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateSeguimientoDto) {
    return this.seguimientosService.create(dto);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll() {
    return this.seguimientosService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'docente', 'estudiante')
  findOne(@Param('id') id: string) {
    return this.seguimientosService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'docente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSeguimientoDto,
  ) {
    return this.seguimientosService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.seguimientosService.remove(id);
  }

  @Get('etapa/:id')
  @Roles('admin', 'docente', 'estudiante')
  findByEtapa(@Param('id', ParseUUIDPipe) id: string) {
    return this.seguimientosService.findByEtapaId(id);
  }

  @Patch(':id/estado')
  @Roles('admin', 'docente')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: string,
  ) {
    return this.seguimientosService.cambiarEstado(id, estado);
  }

  @Patch(':id/acta')
  @Roles('admin', 'docente')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/actas',
      filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/pdf') cb(null, true);
      else cb(new BadRequestException('Solo se permiten archivos PDF'), false);
    },
  }))
  async subirActa(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Debes subir un archivo PDF');
    return this.seguimientosService.subirActa(id, file.filename);
  }

  @Get('alumno/:id')
  @Roles('admin', 'docente', 'estudiante')
  listarPorAlumno(@Param('id') id: string, @Req() req) {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No se envió token');
    return this.seguimientosService.listarSeguimientoPorAlumno(id, token);
  }
}
