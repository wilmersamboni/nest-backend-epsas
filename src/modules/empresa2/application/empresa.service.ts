import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { EmpresaRepositoryPort } from '../domain/ports/empresa.repository.port';
import { Empresa } from '../domain/entities/empresa.entity';
import { CreateEmpresaDto } from '../infrastructure/http/dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../infrastructure/http/dto/update-empresa.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EmpresaService {
  private readonly logger = new Logger('EmpresaService');
  private MUNICIPIO_API_URL = 'http://localhost:3000/api/municipios';

  constructor(
    private readonly empresaRepository: EmpresaRepositoryPort,
    private readonly httpService: HttpService,
  ) {}

  async buscarMunicipio(idMunicipio: string, token: string) {
    if (!token) {
      throw new UnauthorizedException('No se recibió token del cliente');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.MUNICIPIO_API_URL}/${idMunicipio}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }

      throw new InternalServerErrorException(
        `Error consultando municipio: ${error.message}`,
      );
    }
  }

  async create(dto: CreateEmpresaDto, token: string) {
    const municipio = await this.buscarMunicipio(dto.municipio, token);

    if (!municipio) {
      throw new BadRequestException(
        `El municipio con ID ${dto.municipio} no existe`,
      );
    }

    try {
      const empresa = this.empresaRepository.create(dto);
      return await this.empresaRepository.save(empresa);
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

  async update(id: string, dto: UpdateEmpresaDto, token: string) {
    const empresa = await this.findOne(id);

    if (dto.municipio) {
      const municipio = await this.buscarMunicipio(dto.municipio, token);

      if (!municipio) {
        throw new BadRequestException(
          `El municipio con ID ${dto.municipio} no existe`,
        );
      }
    }

    try {
      const updated = Object.assign(empresa, dto);
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