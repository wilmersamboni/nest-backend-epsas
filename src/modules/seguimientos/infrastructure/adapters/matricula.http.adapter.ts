import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IMatriculaServicePort } from '../../domain/ports/matricula.service.port';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class MatriculaHttpAdapter implements IMatriculaServicePort {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async listarPorAlumno(idAlumno: string): Promise<any[]> {
    const token = RequestContextService.getRawToken();
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get('ERP_API_URL')}/matriculas/persona/${idAlumno}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return [];
      throw new InternalServerErrorException(
        `Error consultando matrículas: ${error.message}`,
      );
    }
  }
}
