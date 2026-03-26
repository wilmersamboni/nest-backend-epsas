export interface IMatriculaServicePort {
  listarPorAlumno(idAlumno: string, token: string): Promise<any[]>;
}
export const MATRICULA_SERVICE_PORT = 'MATRICULA_SERVICE_PORT';