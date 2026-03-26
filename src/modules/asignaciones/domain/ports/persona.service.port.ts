export interface IPersonaServicePort {
  buscarPersona(idPersona: string, token: string): Promise<any | null>;
}

export const PERSONA_SERVICE_PORT = 'PERSONA_SERVICE_PORT';