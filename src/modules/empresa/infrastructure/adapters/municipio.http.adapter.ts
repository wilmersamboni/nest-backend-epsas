// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import { IMunicipioServicePort } from '../../domain/ports/municipio.service.port';

// @Injectable()
// export class MunicipioHttpAdapter implements IMunicipioServicePort {
//   private readonly MUNICIPIO_API_URL =
//     'http://localhost:3000/municipio/buscar_jwsv';

//   constructor(private readonly httpService: HttpService) {}

//   async buscarMunicipio(idMunicipio: string, token: string): Promise<any | null> {
//     try {
//       const response = await firstValueFrom(
//         this.httpService.get(`${this.MUNICIPIO_API_URL}/${idMunicipio}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         }),
//       );
//       return response.data;
//     } catch (error) {
//       if (error.response?.status === 404) {
//         return null;
//       }
//       throw new InternalServerErrorException(
//         `Error consultando municipio: ${error.message}`,
//       );
//     }
//   }
// }


import { Injectable } from '@nestjs/common';
import { IMunicipioServicePort } from '../../domain/ports/municipio.service.port';

@Injectable()
export class MunicipioHttpAdapter implements IMunicipioServicePort {

  async buscarMunicipio(idMunicipio: string, _token: string): Promise<any | null> {
    // MOCK temporal — reemplazar cuando el ERP esté disponible
    if (!idMunicipio) return null;
    return { id: idMunicipio, nombre: 'Municipio Mock' };
  }
}