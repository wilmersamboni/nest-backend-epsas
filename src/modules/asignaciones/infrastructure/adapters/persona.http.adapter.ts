import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IPersonaServicePort, PersonaInfo } from '../../domain/ports/persona.service.port';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class PersonaHttpAdapter implements IPersonaServicePort {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async buscarPersona(idPersona: string): Promise<PersonaInfo | null> {
    const raw = RequestContextService.getRawToken();
    if (!raw) throw new UnauthorizedException('No hay token de autenticación en el contexto');

    const bearerToken = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.configService.get('ERP_API_URL')}/personas/${idPersona}`, {
          headers: { Authorization: bearerToken },
        }),
      );
      return response.data;
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 404) return null;
      throw new InternalServerErrorException(
        `Error consultando persona: ${err.message ?? String(err)}`,
      );
    }
  }
}