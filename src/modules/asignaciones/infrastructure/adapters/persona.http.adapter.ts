import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IPersonaServicePort } from '../../domain/ports/persona.service.port';

@Injectable()
export class PersonaHttpAdapter implements IPersonaServicePort {
  private readonly PERSONA_API_URL = 'http://localhost:3000/api/personas';

  constructor(private readonly httpService: HttpService) {}

  async buscarPersona(idPersona: string, token: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.PERSONA_API_URL}/${idPersona}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) return null;
      throw new InternalServerErrorException(`Error consultando persona: ${error.message}`);
    }
  }
}