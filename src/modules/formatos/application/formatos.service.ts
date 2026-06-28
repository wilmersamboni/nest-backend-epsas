import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { CreateFormatoCommand } from './dto/create-formato.command';
import { UpdateFormatoCommand } from './dto/update-formato.command';
import { FORMATO_REPOSITORY_PORT } from '../domain/ports/formato.repository.port';
import type { IFormatoRepository } from '../domain/ports/formato.repository.port';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class FormatosService {
  private readonly logger = new Logger(FormatosService.name);

  constructor(
    @Inject(FORMATO_REPOSITORY_PORT)
    private readonly formatoRepository: IFormatoRepository,
  ) {}

  async create(dto: CreateFormatoCommand, file: Express.Multer.File) {
    const user = RequestContextService.getUser();
    return this.formatoRepository.create({
      tipo:            dto.tipo,
      nombre:          dto.nombre,
      ruta_archivo:    file.filename,
      nombre_original: file.originalname,
      mime_type:       file.mimetype,
      tamanio:         file.size,
      estado:          dto.estado ?? 'activo',
      subido_por:      user?.sub ?? null,
      etapa:           dto.etapaId ? { id: dto.etapaId } : undefined,
    });
  }

  async findAll() {
    return this.formatoRepository.findAll();
  }

  async findOne(id: string) {
    const formato = await this.formatoRepository.findById(id);
    if (!formato) throw new NotFoundException(`Formato con id ${id} no existe`);
    return formato;
  }

  async findByEtapa(etapaId: string) {
    return this.formatoRepository.findByEtapaId(etapaId);
  }

  async findByTipo(etapaId: string, tipo: string) {
    return this.formatoRepository.findByTipo(etapaId, tipo);
  }

  async update(id: string, dto: UpdateFormatoCommand) {
    const formato = await this.formatoRepository.findById(id);
    if (!formato) throw new NotFoundException(`Formato con id ${id} no existe`);
    return this.formatoRepository.save({ ...formato, ...dto, id });
  }

  async cambiarEstado(id: string, estado: string) {
    const validos = ['activo', 'inactivo'];
    if (!validos.includes(estado))
      throw new BadRequestException(`Estado '${estado}' no válido`);
    await this.findOne(id);
    await this.formatoRepository.updateEstado(id, estado);
    return { id, estado };
  }

  async remove(id: string) {
    const formato = await this.findOne(id);
    const filePath = join(process.cwd(), 'uploads', 'formatos', formato.ruta_archivo);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
        this.logger.log(`[Remove] Archivo eliminado: ${filePath}`);
      } catch (e) {
        this.logger.warn(`[Remove] No se pudo eliminar el archivo: ${filePath}`);
      }
    }
    const affected = await this.formatoRepository.deleteById(id);
    if (affected === 0) throw new NotFoundException(`Formato con id ${id} no encontrado`);
    return { message: 'Formato eliminado correctamente' };
  }
}
