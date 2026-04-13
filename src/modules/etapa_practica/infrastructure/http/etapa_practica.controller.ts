import {
  Controller, Get, Post, Body, Patch,
  Param, Delete, ParseUUIDPipe,
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
  create(@Body() dto: CreateEtapaPracticaDto) {
    return this.etapaPracticaService.create(dto);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll() {
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
}
