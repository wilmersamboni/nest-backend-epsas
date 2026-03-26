import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EmpresaService } from '../../application/empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Post()
  @Roles('admin')
  create(@Body() createEmpresaDto: CreateEmpresaDto) {
    return this.empresaService.create(createEmpresaDto);
  }

  @Get()
  @Roles('admin', 'docente')
  findAll() {
    return this.empresaService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'docente', 'estudiante')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresaService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
  ) {
    return this.empresaService.update(id, updateEmpresaDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresaService.remove(id);
  }
}
