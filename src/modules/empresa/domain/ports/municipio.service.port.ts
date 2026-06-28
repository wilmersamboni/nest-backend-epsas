export interface MunicipioInfo {
  id?: string;
  nombre?: string;
  [key: string]: unknown;
}

export interface IMunicipioServicePort {
  buscarMunicipio(idMunicipio: string): Promise<MunicipioInfo | null>;
}

export const MUNICIPIO_SERVICE_PORT = 'MUNICIPIO_SERVICE_PORT';
