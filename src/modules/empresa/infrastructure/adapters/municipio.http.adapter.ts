import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMunicipioServicePort, MunicipioInfo } from '../../domain/ports/municipio.service.port';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class MunicipioHttpAdapter implements IMunicipioServicePort {
  private readonly MUNICIPIO_API_URL =
    process.env.ERP_API_URL
      ? `${process.env.ERP_API_URL}/municipios`
      : 'http://localhost:3000/api/municipios';

  constructor(private readonly httpService: HttpService) {}

  async buscarMunicipio(idMunicipio: string): Promise<MunicipioInfo | null> {
    const token  = RequestContextService.getRawToken();
    const slug   = RequestContextService.get()?.slug ?? null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (slug)  headers['x-tenant']      = slug;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.MUNICIPIO_API_URL}/${idMunicipio}`, { headers }),
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
}