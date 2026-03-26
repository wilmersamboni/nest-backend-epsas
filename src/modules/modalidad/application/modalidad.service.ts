import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateModalidadDto } from '../infrastructure/http/dto/create-modalidad.dto';
import { UpdateModalidadDto } from '../infrastructure/http/dto/update-modalidad.dto';
import { MODALIDAD_REPOSITORY_PORT } from '../domain/ports/modalidad.repository.port';
import type { IModalidadRepository } from '../domain/ports/modalidad.repository.port';

@Injectable()
export class ModalidadService {
  private readonly logger = new Logger('ModalidadService');

  constructor(
    @Inject(MODALIDAD_REPOSITORY_PORT)
    private readonly modalidadRepository: IModalidadRepository,
  ) {}

  async create(dto: CreateModalidadDto) {
    try {
      return await this.modalidadRepository.create(dto);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll() {
    return this.modalidadRepository.findAll();
  }

  async findOne(id: string) {
    const modalidad = await this.modalidadRepository.findById(id);
    if (!modalidad) throw new NotFoundException(`Modalidad con id ${id} no encontrada`);
    return modalidad;
  }

  async update(id: string, dto: UpdateModalidadDto) {
    const modalidad = await this.findOne(id);
    try {
      return await this.modalidadRepository.save({ ...modalidad, ...dto });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const modalidad = await this.findOne(id);
    await this.modalidadRepository.remove(modalidad);
    return { message: `Modalidad con id ${id} eliminada correctamente` };
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Error desconocido, revise el log del servidor');
  }
}