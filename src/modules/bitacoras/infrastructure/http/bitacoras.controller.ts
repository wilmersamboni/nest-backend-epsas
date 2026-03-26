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
