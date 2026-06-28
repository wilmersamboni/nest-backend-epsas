export interface PersonaInfo {
  id?: string;
  nombre?: string;
  apellido?: string;
  [key: string]: unknown;
}

export interface IPersonaServicePort {
  buscarPersona(idPersona: string): Promise<PersonaInfo | null>;
}

export const PERSONA_SERVICE_PORT = 'PERSONA_SERVICE_PORT';