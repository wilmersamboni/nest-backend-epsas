import {
  Controller, Get, Post, Body, Patch,
  Param, Delete, ParseUUIDPipe, Headers, Req, UnauthorizedException
} from '@nestjs/common';
import { EtapaPracticaService } from '../../application/etapa_practica.service';
import { CreateEtapaPracticaDto } from './dto/create-etapa_practica.dto';
import { UpdateEtapaPracticaDto } from './dto/update-etapa_practica.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('etapa-practica')
export class EtapaPracticaController {
  constructor(private readonly etapaPracticaService: EtapaPracticaService) {}

  @Post()
@Roles('admin')
create(
  @Body() dto: CreateEtapaPracticaDto,
  @Req() req
) {
  const token =
    req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new UnauthorizedException('No se envió token');
  }

  return this.etapaPracticaService.create(dto, token);
}

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll(@Headers('x-matricula-id') matriculaId?: string) {
    if (matriculaId) {
      return this.etapaPracticaService.buscarPorMatricula(matriculaId);
    }
    return this.etapaPracticaService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'docente', 'estudiante')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.etapaPracticaService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'docente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEtapaPracticaDto,
  ) {
    return this.etapaPracticaService.update(id, dto);
  }

  @Patch(':id/estado')
  @Roles('admin', 'docente')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: string,
  ) {
    return this.etapaPracticaService.cambiarEstado(id, estado);
  }

  @Patch(':id/activar')
  @Roles('admin')
  activar(@Param('id', ParseUUIDPipe) id: string) {
    return this.etapaPracticaService.activar(id);
  }

  @Patch(':id/inactivar')
  @Roles('admin')
  inactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.etapaPracticaService.inactivar(id);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.etapaPracticaService.remove(id);
  }

  @Patch('observacion/:id')
  @Roles('admin', 'docente')
  actualizarObservacion(
    @Param('id') id: string,
    @Body('observacion') observacion: string,
  ) {
    return this.etapaPracticaService.actualizarObservacion(id, observacion);
  }

  @Get('matricula/:matriculaId')
  @Roles('admin', 'docente', 'estudiante')
  buscarPorMatricula(@Param('matriculaId') matriculaId: string) {
    return this.etapaPracticaService.buscarPorMatricula(matriculaId);
  }

  @Patch('avance/:id')
  @Roles('admin', 'docente')
  actualizarAvance(@Param('id') id: string) {
    // El backend calcula el avance sumando bitácoras aceptadas
    // de todos los seguimientos de esta etapa práctica
    return this.etapaPracticaService.actualizarAvance(id);
  }
}
