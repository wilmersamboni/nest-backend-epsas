import { Controller, Post, Get, Put, Delete, Body, Param, Headers } from '@nestjs/common';
import { EmpresaService } from '../../application/empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Controller('empresas')
export class EmpresaController {
  constructor(private readonly service: EmpresaService) {}

  @Post()
  create(
    @Body() dto: CreateEmpresaDto,
    @Headers('authorization') token: string,
  ) {
    return this.service.create(dto, token?.replace('Bearer ', ''));
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmpresaDto,
    @Headers('authorization') token: string,
  ) {
    return this.service.update(id, dto, token?.replace('Bearer ', ''));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}