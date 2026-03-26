import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateSeguimientoDto } from '../infrastructure/http/dto/create-seguimiento.dto';
import { UpdateSeguimientoDto } from '../infrastructure/http/dto/update-seguimiento.dto';
import { SEGUIMIENTO_REPOSITORY_PORT } from '../domain/ports/seguimiento.repository.port';
import { MATRICULA_SERVICE_PORT } from '../domain/ports/matricula.service.port';
import type { ISeguimientoRepository } from '../domain/ports/seguimiento.repository.port';
import type { IMatriculaServicePort } from '../domain/ports/matricula.service.port';

@Injectable()
export class SeguimientosService {
  private readonly logger = new Logger('SeguimientosService');

  constructor(
    @Inject(SEGUIMIENTO_REPOSITORY_PORT)
    private readonly seguimientoRepository: ISeguimientoRepository,

    @Inject(MATRICULA_SERVICE_PORT)
    private readonly matriculaService: IMatriculaServicePort,
  ) {}

  async create(dto: CreateSeguimientoDto) {
    try {
      const { etapaId, asignacionId, ...data } = dto;
      return await this.seguimientoRepository.create({
        ...data,
        etapa: { id: etapaId },
        asignacion: { id: asignacionId },
      });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll() {
    return this.seguimientoRepository.findAll();
  }

  async findOne(id: string) {
    const seguimiento = await this.seguimientoRepository.findById(id);
    if (!seguimiento)
      throw new NotFoundException(`Seguimiento con id ${id} no encontrado`);
    return seguimiento;
  }

  async update(id: string, dto: UpdateSeguimientoDto) {
    const seguimiento = await this.findOne(id);
    try {
      return await this.seguimientoRepository.save({ ...seguimiento, ...dto });
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const seguimiento = await this.findOne(id);
    await this.seguimientoRepository.remove(seguimiento);
    return { message: `Seguimiento con id ${id} eliminado correctamente` };
  }

  // El token sigue siendo necesario aquí para reenviar al microservicio externo de matrículas
  async listarSeguimientoPorAlumno(id_alumno: string, token: string) {
    if (!token)
      throw new UnauthorizedException('No se encontró la cookie de sesión');

    const matriculas = await this.matriculaService.listarPorAlumno(
      id_alumno,
      token,
    );

    if (!Array.isArray(matriculas) || !matriculas.length) return [];

    const idsMatricula = matriculas.map((m) => m.matriculaId);
    return this.seguimientoRepository.findByMatriculaIds(idsMatricula);
  }

  // Método interno para ser usado por otros módulos, sin token de auth
  async createInternal(data: {
    actas_pdf: string;
    estado: string;
    observacion: string;
    fecha_inicio: Date;
    fecha_fin: Date;
    etapaId: string;
    asignacionId?: string;
  }) {
    const { etapaId, asignacionId, ...rest } = data;
    return this.seguimientoRepository.create({
      ...rest,
      etapa: { id: etapaId },
      ...(asignacionId ? { asignacion: { id: asignacionId } } : {}),
    });
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Error desconocido, revise el log del servidor',
    );
  }
}
