import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMunicipioServicePort } from '../../domain/ports/municipio.service.port';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class MunicipioHttpAdapter implements IMunicipioServicePort {
  private readonly MUNICIPIO_API_URL =
    process.env.ERP_API_URL
      ? `${process.env.ERP_API_URL}/municipios`
      : 'http://localhost:3000/api/municipios';

  constructor(private readonly httpService: HttpService) {}

  async buscarMunicipio(idMunicipio: string, _token?: string): Promise<any | null> {
    const token = RequestContextService.getRawToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.MUNICIPIO_API_URL}/${idMunicipio}`, {
          headers: { Authorization: `Bearer ${token}` },
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
}