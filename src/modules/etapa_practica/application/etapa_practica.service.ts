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
import { AsignacionesService } from 'src/modules/asignaciones/application/asignaciones.service';
import { ConfiguracionService } from 'src/modules/configuracion/configuracion.service';
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
    private readonly asignacionesService: AsignacionesService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  async create(dto: CreateEtapaPracticaDto, token?: string) {
    try {
      const { empresaId, modalidadId, asignacion, avanceMatricula, ...data } = dto;

      // Validar avance mínimo si el cliente lo envía
      if (avanceMatricula !== undefined) {
        const config = await this.configuracionService.getConfig();
        if (avanceMatricula < config.minAvance) {
          throw new BadRequestException(
            `El aprendiz no cumple el avance mínimo requerido ` +
            `(${config.minAvance}%). Avance actual: ${avanceMatricula}%`,
          );
        }
      }

      // 1. Crear etapa
      const practica = await this.etapaPracticaRepository.create({
        ...data,
        empresa: { id: empresaId },
        modalidad: { id: modalidadId },
      });

      // 2. Calcular fechas de los seguimientos
      const fechaInicio = new Date(practica.fecha_inicio);
          
      const fechaMitad = new Date(fechaInicio);
      fechaMitad.setMonth(fechaMitad.getMonth() + 2); // mes 2
          
      const fechaTercio = new Date(fechaInicio);
      fechaTercio.setMonth(fechaTercio.getMonth() + 4); // mes 4
          
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + 6); // mes 6
          
      // 3. Crear los tres seguimientos
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
        fecha_fin: fechaTercio,
        etapaId: practica.id,
      });
      
      const seg3 = await this.seguimientosService.createInternal({
        actas_pdf: 'pendiente',
        estado: 'activo',
        observacion: 'Tercer seguimiento',
        fecha_inicio: fechaTercio,
        fecha_fin: fechaFin,
        etapaId: practica.id,
      });
      
      // 4. Crear 2 bitácoras por seguimiento (6 en total)
      for (const seg of [seg1, seg2, seg3]) {
        for (let i = 1; i <= 2; i++) {
          const fechaBitacora = new Date(seg.fecha_inicio);
          fechaBitacora.setMonth(fechaBitacora.getMonth() + i);
        
          await this.bitacorasService.createInternal({
            fecha: fechaBitacora,
            bitacora_pdf: 'pendiente',
            estado: 'pendiente',
            seguimientoId: seg.id,
          });
        }
      }

      // 5. Crear asignación de instructor si se envió en el body
      if (asignacion) {
        await this.asignacionesService.create(
          { ...asignacion, etapaId: practica.id },
          token ?? '',
        );
        this.logger.log(`[Create] Asignación de instructor creada para etapa ${practica.id}`);
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

  async actualizarAvance(id: string): Promise<{ avance: number }> {
    try {
      // Obtener todos los seguimientos de esta etapa práctica
      const seguimientos = await this.seguimientosService.findByEtapaId(id);

      // Contar bitácoras aceptadas en TODOS los seguimientos
      let totalBitacoras = 0;
      let aceptadas      = 0;

      for (const seg of seguimientos) {
        const bits = await this.bitacorasService.findBySeguimientoId(seg.id);
        totalBitacoras += bits.length;
        aceptadas      += bits.filter((b: any) => b.estado === 'aceptada').length;
      }

      const avance = totalBitacoras > 0
        ? Math.min(100, Math.round((aceptadas / totalBitacoras) * 100))
        : 0;

      this.logger.log(`[Avance] etapa=${id} → ${aceptadas}/${totalBitacoras} = ${avance}%`);

      await this.etapaPracticaRepository.updateAvance(id, avance);
      return { avance };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async cambiarEstado(id: string, nuevoEstado: string): Promise<{ id: string; estado: string }> {
    const validos = ['activo', 'inactivo', 'suspendido', 'por certificar', 'certificado'];
    if (!validos.includes(nuevoEstado)) {
      throw new BadRequestException(`Estado '${nuevoEstado}' no es válido`);
    }
    await this.etapaPracticaRepository.updateEstado(id, nuevoEstado);
    return { id, estado: nuevoEstado };
  }

  async activar(id: string): Promise<{ mensaje: string }> {
    const practica = await this.etapaPracticaRepository.findById(id);
    if (!practica)
      throw new NotFoundException(`Etapa practica con id ${id} no encontrada`);
    if (practica.estado === 'activo')
      throw new BadRequestException('La etapa práctica ya se encuentra activa');

    await this.etapaPracticaRepository.updateEstado(id, 'activo');
    return { mensaje: 'Etapa práctica activada correctamente' };
  }

  async inactivar(id: string): Promise<{ mensaje: string }> {
    const practica = await this.etapaPracticaRepository.findById(id);
    if (!practica)
      throw new NotFoundException(`Etapa practica con id ${id} no encontrada`);
    if (practica.estado === 'inactivo')
      throw new BadRequestException('La etapa práctica ya se encuentra inactiva');

    await this.etapaPracticaRepository.updateEstado(id, 'inactivo');
    return { mensaje: 'Etapa práctica inactivada correctamente' };
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error desconocido, revise el log del servidor',
    );
  }
}

