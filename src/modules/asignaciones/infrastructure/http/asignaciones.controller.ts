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
import { AsignacionesService } from '../../application/asignaciones.service';
import { CreateAsignacioneDto } from './dto/create-asignacione.dto';
import { UpdateAsignacioneDto } from './dto/update-asignacione.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('asignaciones')
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Post()
  @Roles('admin')
  create(@Body() createAsignacioneDto: CreateAsignacioneDto, @Req() req) {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No se envió token');
    return this.asignacionesService.create(createAsignacioneDto, token);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll() {
    return this.asignacionesService.findAll();
  }

  /** Retorna todas las asignaciones de una etapa práctica específica */
  @Get('etapa/:etapaId')
  @Roles('admin', 'docente')
  findByEtapa(@Param('etapaId', ParseUUIDPipe) etapaId: string) {
    return this.asignacionesService.findByEtapa(etapaId);
  }

  @Get(':id')
  @Roles('admin', 'docente', 'estudiante')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.asignacionesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAsignacioneDto: UpdateAsignacioneDto,
    @Req() req,
  ) {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No se envió token');
    return this.asignacionesService.update(id, updateAsignacioneDto, token);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.asignacionesService.remove(id);
  }
}
  