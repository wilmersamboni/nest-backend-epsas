import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateBitacoraDto } from '../infrastructure/http/dto/create-bitacora.dto';
import { UpdateBitacoraDto } from '../infrastructure/http/dto/update-bitacora.dto';
import { BITACORA_REPOSITORY_PORT } from '../domain/ports/bitacora.repository.port';
import type { IBitacoraRepository } from '../domain/ports/bitacora.repository.port';

@Injectable()
export class BitacorasService {
  private readonly logger = new Logger('BitacorasService');

  constructor(
    @Inject(BITACORA_REPOSITORY_PORT)
    private readonly bitacoraRepository: IBitacoraRepository,
  ) {}

  async create(dto: CreateBitacoraDto) {
    const { seguimientoId, ...data } = dto;
    return this.bitacoraRepository.create({ ...data, seguimiento: { id: seguimientoId } });
  }

  async findAll() { return this.bitacoraRepository.findAll(); }

  async findOne(id: string) {
    const b = await this.bitacoraRepository.findById(id);
    if (!b) throw new NotFoundException(`Bitacora con id ${id} no encontrada`);
    return b;
  }

  async update(id: string, dto: UpdateBitacoraDto) {
    const bitacora = await this.findOne(id);
    try {
      return await this.bitacoraRepository.save({ ...bitacora, ...dto });
    } catch (error) { this.handleDBExceptions(error); }
  }

  async remove(id: string) {
    const affected = await this.bitacoraRepository.deleteById(id);
    if (affected === 0) throw new NotFoundException(`Bitacora con id ${id} no encontrada`);
    return { message: `Bitacora con id ${id} eliminada correctamente` };
  }

  async cambiarEstado(id: string, estado: string) {
    const validos = ['pendiente', 'aceptada', 'rechazada'];
    if (!validos.includes(estado)) throw new BadRequestException('Estado inválido');
    const bitacora = await this.findOne(id);
    return this.bitacoraRepository.save({ ...bitacora, estado });
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Error desconocido, revise el log del servidor');
  }

  // Método interno para ser usado por otros módulos
async createInternal(data: {
  fecha: Date;
  bitacora_pdf: string;
  estado: string;
  seguimientoId: string;
}) {
  const { seguimientoId, ...rest } = data;
  return this.bitacoraRepository.create({ ...rest, seguimiento: { id: seguimientoId } });
}
}