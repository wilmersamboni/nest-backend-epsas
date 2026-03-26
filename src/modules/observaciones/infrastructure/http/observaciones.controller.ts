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
import { ObservacionesService } from '../../application/observaciones.service';
import { CreateObservacioneDto } from './dto/create-observacione.dto';
import { UpdateObservacioneDto } from './dto/update-observacione.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Post()
  @Roles('admin', 'docente')
  create(@Body() dto: CreateObservacioneDto) {
    return this.observacionesService.create(dto);
  }

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  findAll() {
    return this.observacionesService.findAll();
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
