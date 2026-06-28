export interface IMatriculaServicePort {
  listarPorAlumno(idAlumno: string): Promise<any[]>;
}
export const MATRICULA_SERVICE_PORT = 'MATRICULA_SERVICE_PORT';
