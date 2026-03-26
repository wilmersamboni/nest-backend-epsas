import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ModalidadService } from '../../application/modalidad.service';
import { CreateModalidadDto } from './dto/create-modalidad.dto';
import { UpdateModalidadDto } from './dto/update-modalidad.dto';

@Controller('modalidad')
export class ModalidadController {
  constructor(private readonly modalidadService: ModalidadService) {}

  @Post()
  create(@Body() dto: CreateModalidadDto) {
    return this.modalidadService.create(dto);
  }

  @Get()
  findAll() {
    return this.modalidadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modalidadService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModalidadDto) {
    return this.modalidadService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.modalidadService.remove(id);
  }
}