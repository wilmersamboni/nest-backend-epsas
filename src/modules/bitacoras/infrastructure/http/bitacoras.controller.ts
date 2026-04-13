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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BitacorasService } from '../../application/bitacoras.service';
import { CreateBitacoraDto } from './dto/create-bitacora.dto';
import { UpdateBitacoraDto } from './dto/update-bitacora.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('bitacoras')
export class BitacorasController {
  constructor(private readonly bitacorasService: BitacorasService) {}

  @Post()
  @Roles('admin', 'docente')
  create(@Body() dto: CreateBitacoraDto) {
    return this.bitacorasService.create(dto);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll() {
    return this.bitacorasService.findAll();
  }

  // ⚠️ Rutas específicas antes de :id para evitar que NestJS las interprete como UUID
  @Get('seguimiento/:id')
  @Roles('admin', 'docente', 'estudiante')
  findBySeguimiento(@Param('id', ParseUUIDPipe) id: string) {
    return this.bitacorasService.findBySeguimientoId(id);
  }

  @Patch(':id/estado')
  @Roles('admin', 'docente')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: string,
  ) {
    return this.bitacorasService.cambiarEstado(id, estado);
  }

  @Post(':id/pdf')
  @Roles('admin', 'docente', 'estudiante')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/bitacoras',
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
  async subirPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Debes subir un archivo PDF');
    return this.bitacorasService.actualizarPdf(id, file.filename);
  }

  @Get(':id')
  @Roles('admin', 'docente', 'estudiante')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bitacorasService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'docente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBitacoraDto,
  ) {
    return this.bitacorasService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bitacorasService.remove(id);
  }
}
