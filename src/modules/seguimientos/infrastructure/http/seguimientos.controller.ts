import {
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
} from '@nestjs/common';
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

  @Get('alumno/:id')
  @Roles('admin', 'docente', 'estudiante')
  listarPorAlumno(@Param('id') id: string, @Req() req) {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No se envió token');
    return this.seguimientosService.listarSeguimientoPorAlumno(id, token);
  }
}
