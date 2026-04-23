import {
  BadRequestException, Inject, Injectable,
  InternalServerErrorException, Logger, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { CreateAsignacioneDto } from '../infrastructure/http/dto/create-asignacione.dto';
import { UpdateAsignacioneDto } from '../infrastructure/http/dto/update-asignacione.dto';
import { ASIGNACION_REPOSITORY_PORT, } from '../domain/ports/asignacion.repository.port';
import { PERSONA_SERVICE_PORT } from '../domain/ports/persona.service.port';
import type { IPersonaServicePort } from '../domain/ports/persona.service.port';
import type { IAsignacionRepository } from '../domain/ports/asignacion.repository.port';

@Injectable()
export class AsignacionesService {
  private readonly logger = new Logger('AsignacionesService');

  constructor(
    @Inject(ASIGNACION_REPOSITORY_PORT)
    private readonly asignacionRepository: IAsignacionRepository,

    @Inject(PERSONA_SERVICE_PORT)
    private readonly personaService: IPersonaServicePort,
  ) {}

  async create(dto: CreateAsignacioneDto, token: string) {
    if (!token) throw new UnauthorizedException('No se envió token');

    const persona = await this.personaService.buscarPersona(dto.instructor, token);
    if (!persona) throw new BadRequestException(`El instructor con ID ${dto.instructor} no existe`);

    try {
      const { etapaId, ...data } = dto;
      return await this.asignacionRepository.create({ ...data, etapa: { id: etapaId } });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll() {
    return this.asignacionRepository.findAll();
  }

  async findByEtapa(etapaId: string) {
    return this.asignacionRepository.findByEtapaId(etapaId);
  }

  async findOne(id: string) {
    const asignacion = await this.asignacionRepository.findById(id);
    if (!asignacion) throw new NotFoundException(`Asignacion con el id ${id} no encontrada`);
    return asignacion;
  }

  async update(id: string, dto: UpdateAsignacioneDto, token: string) {
    const asignacion = await this.findOne(id);

    if (dto.instructor) {
      const persona = await this.personaService.buscarPersona(dto.instructor, token);
      if (!persona) throw new BadRequestException(`La persona con ID ${dto.instructor} no existe`);
    }

    try {
      const { etapaId, ...data } = dto;
      const updated = { ...asignacion, ...data };
      if (etapaId) updated.etapa = { id: etapaId };
      return await this.asignacionRepository.save(updated);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const affected = await this.asignacionRepository.deleteById(id);
    if (affected === 0) throw new NotFoundException(`Asignacion con id ${id} no encontrada`);
    return { message: 'Asignacion eliminada correctamente' };
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Error desconocido, revise el log del servidor');
  }
}