import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateObservacionCommand,
  CreateObservacionParaEtapaCommand,
} from './dto/create-observacion.command';
import { UpdateObservacionCommand } from './dto/update-observacion.command';
import { OBSERVACION_REPOSITORY_PORT } from '../domain/ports/observacion.repository.port';
import type { IObservacionRepository } from '../domain/ports/observacion.repository.port';
import { SeguimientosService } from 'src/modules/seguimientos/application/seguimientos.service';

@Injectable()
export class ObservacionesService {
  private readonly logger = new Logger('ObservacionesService');

  constructor(
    @Inject(OBSERVACION_REPOSITORY_PORT)
    private readonly observacionRepository: IObservacionRepository,
    private readonly seguimientosService: SeguimientosService,
  ) {}

  async create(dto: CreateObservacionCommand) {
    try {
      const { seguimientoId, ...data } = dto;
      return await this.observacionRepository.create({
        ...data,
        seguimiento: { id: seguimientoId },
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async createParaEtapa(etapaId: string, data: CreateObservacionParaEtapaCommand) {
    const seguimientos = await this.seguimientosService.findByEtapaId(etapaId);

    if (!seguimientos.length) {
      throw new BadRequestException(
        'La etapa práctica no tiene ningún seguimiento registrado. ' +
          'Crea un seguimiento antes de registrar observaciones.',
      );
    }

    // Ordenar por fecha_inicio DESC para tomar el más reciente
    const sorted = [...seguimientos].sort((a: any, b: any) =>
      new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime(),
    );
    const seguimientoId: string = (sorted[0] as any).id;

    try {
      return await this.observacionRepository.create({
        descripcion:    data.descripcion,
        persona:        data.persona,
        fecha:          data.fecha,
        evidencia_foto: '',
        seguimiento:    { id: seguimientoId },
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findByEtapa(etapaId: string) {
    return this.observacionRepository.findByEtapaId(etapaId);
  }

  async findBySeguimiento(seguimientoId: string) {
    return this.observacionRepository.findBySeguimientoId(seguimientoId);
  }

  async findAll() {
    return this.observacionRepository.findAll();
  }

  async findOne(id: string) {
    const o = await this.observacionRepository.findById(id);
    if (!o) throw new NotFoundException(`Observacion con id ${id} no encontrada`);
    return o;
  }

  async update(id: string, dto: UpdateObservacionCommand) {
    const observacion = await this.findOne(id);
    try {
      return await this.observacionRepository.save({ ...observacion, ...dto });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const affected = await this.observacionRepository.deleteById(id);
    if (affected === 0)
      throw new NotFoundException(`Observacion con id ${id} no encontrada`);
    return { message: `Observacion con id ${id} eliminada correctamente` };
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error desconocido, revise el log del servidor',
    );
  }
}
