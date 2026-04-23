import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateObservacioneDto } from '../infrastructure/http/dto/create-observacione.dto';
import { UpdateObservacioneDto } from '../infrastructure/http/dto/update-observacione.dto';
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

  async create(dto: CreateObservacioneDto) {
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

  /**
   * Crea una observación ligada al seguimiento más reciente de una etapa.
   * Lanza 400 si la etapa no tiene ningún seguimiento registrado.
   */
  async createParaEtapa(
    etapaId: string,
    data: { descripcion: string; persona: string; fecha: string },
  ) {
    const seguimientos = await this.seguimientosService.findByEtapaId(etapaId);

    if (!seguimientos.length) {
      throw new BadRequestException(
        'La etapa práctica no tiene ningún seguimiento registrado. ' +
          'Crea un seguimiento antes de registrar observaciones.',
      );
    }

    // Usamos el seguimiento más reciente (último en el array devuelto)
    const ultimo = seguimientos[seguimientos.length - 1] as any;
    const seguimientoId: string = ultimo.id;

    try {
      return await this.observacionRepository.create({
        descripcion: data.descripcion,
        persona:     data.persona,
        fecha:       data.fecha,
        evidencia_foto: '',
        seguimiento: { id: seguimientoId },
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  /** Lista todas las observaciones de todos los seguimientos de una etapa */
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

  async update(id: string, dto: UpdateObservacioneDto) {
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
