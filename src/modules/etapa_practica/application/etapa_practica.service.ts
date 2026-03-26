import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEtapaPracticaDto } from '../infrastructure/http/dto/create-etapa_practica.dto';
import { UpdateEtapaPracticaDto } from '../infrastructure/http/dto/update-etapa_practica.dto';
import {

  ETAPA_PRACTICA_REPOSITORY_PORT,
} from '../domain/ports/etapa_practica.repository.port';
import { SeguimientosService } from 'src/modules/seguimientos/application/seguimientos.service';
import { BitacorasService } from 'src/modules/bitacoras/application/bitacoras.service';
import type { IEtapaPracticaRepository } from '../domain/ports/etapa_practica.repository.port';

@Injectable()
export class EtapaPracticaService {
  private readonly logger = new Logger('EtapaPracticaService');

  constructor(
    @Inject(ETAPA_PRACTICA_REPOSITORY_PORT)
    private readonly etapaPracticaRepository: IEtapaPracticaRepository,

    // Servicios de otros módulos inyectados directamente
    // (son dependencias de aplicación, no de dominio)
    private readonly seguimientosService: SeguimientosService,
    private readonly bitacorasService: BitacorasService,
  ) {}

  async create(dto: CreateEtapaPracticaDto) {
    try {
      const { empresaId, modalidadId, ...data } = dto;

      // 1. Crear etapa
      const practica = await this.etapaPracticaRepository.create({
        ...data,
        empresa: { id: empresaId },
        modalidad: { id: modalidadId },
      });

      // 2. Calcular fechas de los seguimientos
      const fechaInicio = new Date(practica.fecha_inicio);

      const fechaMitad = new Date(fechaInicio);
      fechaMitad.setMonth(fechaMitad.getMonth() + 3);

      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + 6);

      // 3. Crear los dos seguimientos usando el service de ese módulo
      const seg1 = await this.seguimientosService.createInternal({
        actas_pdf: 'pendiente',
        estado: 'activo',
        observacion: 'Primer seguimiento',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaMitad,
        etapaId: practica.id,
      });

      const seg2 = await this.seguimientosService.createInternal({
        actas_pdf: 'pendiente',
        estado: 'activo',
        observacion: 'Segundo seguimiento',
        fecha_inicio: fechaMitad,
        fecha_fin: fechaFin,
        etapaId: practica.id,
      });

      // 4. Crear 3 bitácoras por seguimiento
      for (const seg of [seg1, seg2]) {
        for (let i = 1; i <= 3; i++) {
          const fechaBitacora = new Date(seg.fecha_inicio);
          fechaBitacora.setMonth(fechaBitacora.getMonth() + i + 1);

          await this.bitacorasService.createInternal({
            fecha: fechaBitacora,
            bitacora_pdf: 'pendiente',
            estado: 'pendiente',
            seguimientoId: seg.id,
          });
        }
      }

      return practica;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll() {
    return this.etapaPracticaRepository.findAll();
  }

  async findOne(id: string) {
    const practica = await this.etapaPracticaRepository.findById(id);
    if (!practica)
      throw new NotFoundException(`Etapa Practica con id ${id} no existe`);
    return practica;
  }

  async update(id: string, dto: UpdateEtapaPracticaDto) {
    const practica = await this.etapaPracticaRepository.findByIdWithRelations(id);
    if (!practica)
      throw new NotFoundException(`Etapa practica con id ${id} no encontrada`);

    const { empresaId, modalidadId, ...data } = dto;

    const updated = { ...practica, ...data };
    if (empresaId) updated.empresa = { id: empresaId };
    if (modalidadId) updated.modalidad = { id: modalidadId };

    try {
      return await this.etapaPracticaRepository.save(updated);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const affected = await this.etapaPracticaRepository.deleteById(id);
    if (affected === 0)
      throw new NotFoundException(`EtapaPractica con id ${id} no encontrada`);
    return { message: 'Etapa eliminada correctamente' };
  }

  async actualizarObservacion(id: string, observacion: string) {
    try {
      await this.etapaPracticaRepository.updateObservacion(id, observacion);
      return { status: 200, mensaje: 'Observación actualizada' };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async buscarPorMatricula(matriculaId: string) {
    const result = await this.etapaPracticaRepository.findByMatriculaId(matriculaId);
    if (!result) throw new NotFoundException('Sin registros');
    return result;
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error desconocido, revise el log del servidor',
    );
  }
}