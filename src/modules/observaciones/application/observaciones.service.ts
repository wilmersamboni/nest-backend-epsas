import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateObservacioneDto } from '../infrastructure/http/dto/create-observacione.dto';
import { UpdateObservacioneDto } from '../infrastructure/http/dto/update-observacione.dto';
import {  OBSERVACION_REPOSITORY_PORT } from '../domain/ports/observacion.repository.port';
import type { IObservacionRepository } from '../domain/ports/observacion.repository.port';

@Injectable()
export class ObservacionesService {
  private readonly logger = new Logger('ObservacionesService');

  constructor(
    @Inject(OBSERVACION_REPOSITORY_PORT)
    private readonly observacionRepository: IObservacionRepository,
  ) {}

  async create(dto: CreateObservacioneDto) {
    try {
      const { seguimientoId, ...data } = dto;
      return await this.observacionRepository.create({ ...data, seguimiento: { id: seguimientoId } });
    } catch (error) { this.handleDBExceptions(error); }
  }

  async findAll() { return this.observacionRepository.findAll(); }

  async findOne(id: string) {
    const o = await this.observacionRepository.findById(id);
    if (!o) throw new NotFoundException(`Observacion con id ${id} no encontrada`);
    return o;
  }

  async update(id: string, dto: UpdateObservacioneDto) {
    const observacion = await this.findOne(id);
    try {
      return await this.observacionRepository.save({ ...observacion, ...dto });
    } catch (error) { this.handleDBExceptions(error); }
  }

  async remove(id: string) {
    const affected = await this.observacionRepository.deleteById(id);
    if (affected === 0) throw new NotFoundException(`Observacion con id ${id} no encontrada`);
    return { message: `Observacion con id ${id} eliminada correctamente` };
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Error desconocido, revise el log del servidor');
  }
}