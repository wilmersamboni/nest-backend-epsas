export interface IMunicipioServicePort {
  buscarMunicipio(idMunicipio: string, token: string): Promise<any | null>;
}

export const MUNICIPIO_SERVICE_PORT = 'MUNICIPIO_SERVICE_PORT';
