import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPersonaServicePort } from '../../domain/ports/persona.service.port';

@Injectable()
export class PersonaHttpAdapter implements IPersonaServicePort {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async buscarPersona(idPersona: string, token: string): Promise<any | null> {
  try {
    // Normalizar: aceptar con o sin "Bearer "
    const bearerToken = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;

    const response = await firstValueFrom(
      this.httpService.get(`${this.configService.get('ERP_API_URL')}/personas/${idPersona}`, {
        headers: { Authorization: bearerToken },
      }),
    );
    return response.data;
  }catch (error) {
  const err = error as any;
  if (err.response?.status === 404) return null;
  throw new InternalServerErrorException(
    `Error consultando persona: ${err.message ?? String(err)}`,
  );
}
}
}