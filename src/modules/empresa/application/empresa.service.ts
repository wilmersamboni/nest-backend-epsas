import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpresaCommand } from './dto/create-empresa.command';
import { UpdateEmpresaCommand } from './dto/update-empresa.command';
import { EMPRESA_REPOSITORY_PORT } from '../domain/ports/empresa.repository.port';
import type { IEmpresaRepository } from '../domain/ports/empresa.repository.port';
import type { IMunicipioServicePort } from '../domain/ports/municipio.service.port';
import { MUNICIPIO_SERVICE_PORT } from '../domain/ports/municipio.service.port';

@Injectable()
export class EmpresaService {
  private readonly logger = new Logger('EmpresaService');

  constructor(
    @Inject(EMPRESA_REPOSITORY_PORT)
    private readonly empresaRepository: IEmpresaRepository,

    @Inject(MUNICIPIO_SERVICE_PORT)
    private readonly municipioService: IMunicipioServicePort,
  ) {}

  async create(dto: CreateEmpresaCommand) {
    const municipio = await this.municipioService.buscarMunicipio(dto.municipio);
    if (!municipio) {
      throw new BadRequestException(`El municipio con ID ${dto.municipio} no existe`);
    }
    try {
      return await this.empresaRepository.create(dto);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll() {
    return this.empresaRepository.findAll();
  }

  async findOne(id: string) {
    const empresa = await this.empresaRepository.findById(id);
    if (!empresa) {
      throw new NotFoundException(`Empresa con id ${id} no encontrada`);
    }
    return empresa;
  }

  async update(id: string, dto: UpdateEmpresaCommand) {
    const empresa = await this.findOne(id);
    if (dto.municipio) {
      const municipio = await this.municipioService.buscarMunicipio(dto.municipio);
      if (!municipio) {
        throw new BadRequestException(`El municipio con ID ${dto.municipio} no existe`);
      }
    }
    try {
      const updated = { ...empresa, ...dto };
      return await this.empresaRepository.save(updated);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const empresa = await this.findOne(id);
    await this.empresaRepository.remove(empresa);
    return { message: `Empresa con id ${id} eliminada correctamente` };
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Error desconocido, revise el log del servidor');
  }
}
