import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IMatriculaServicePort } from '../../domain/ports/matricula.service.port';

@Injectable()
export class MatriculaHttpAdapter implements IMatriculaServicePort {
  private readonly MATRICULA_API_URL = 'http://localhost:3000/matricula/por-alumno';

  constructor(private readonly httpService: HttpService) {}

  async listarPorAlumno(idAlumno: string, token: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.MATRICULA_API_URL}/${idAlumno}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
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