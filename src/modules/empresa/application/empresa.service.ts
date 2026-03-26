import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpresaDto } from '../infrastructure/http/dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../infrastructure/http/dto/update-empresa.dto';
import { EMPRESA_REPOSITORY_PORT } from '../domain/ports/empresa.repository.port';
import type { IEmpresaRepository } from '../domain/ports/empresa.repository.port';
import type { IMunicipioServicePort } from '../domain/ports/municipio.service.port';
import { MUNICIPIO_SERVICE_PORT } from '../domain/ports/municipio.service.port';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class EmpresaService {
  private readonly logger = new Logger('EmpresaService');

  constructor(
    @Inject(EMPRESA_REPOSITORY_PORT)
    private readonly empresaRepository: IEmpresaRepository,

    @Inject(MUNICIPIO_SERVICE_PORT)
    private readonly municipioService: IMunicipioServicePort,
  ) {}

  // El token ya no viene del controller — se lee del contexto del request
  private getToken(): string {
    const user = RequestContextService.getUser();
    // El token raw no está en el contexto, pero el middleware lo dejó en la request.
    // Para reenviar el token al servicio externo de municipios, lo seguimos leyendo
    // desde el header vía REQUEST scope o lo pasamos explícitamente.
    // Por ahora conservamos compatibilidad: el controller puede pasar el token
    // o se puede refactorizar el adapter de municipios para leerlo del contexto.
    return '';
  }

  async create(createEmpresaDto: CreateEmpresaDto, token?: string) {
    const municipio = await this.municipioService.buscarMunicipio(
      createEmpresaDto.municipio,
      token ?? '',
    );

    if (!municipio) {
      throw new BadRequestException(
        `El municipio con ID ${createEmpresaDto.municipio} no existe`,
      );
    }

    try {
      return await this.empresaRepository.create(createEmpresaDto);
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

  async update(id: string, updateEmpresaDto: UpdateEmpresaDto, token?: string) {
    const empresa = await this.findOne(id);

    if (updateEmpresaDto.municipio) {
      const municipio = await this.municipioService.buscarMunicipio(
        updateEmpresaDto.municipio,
        token ?? '',
      );
      if (!municipio) {
        throw new BadRequestException(
          `El municipio con ID ${updateEmpresaDto.municipio} no existe`,
        );
      }
    }

    try {
      const updated = { ...empresa, ...updateEmpresaDto };
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
    throw new InternalServerErrorException(
      'Error desconocido, revise el log del servidor',
    );
  }
}
