export interface CreateAsignacionCommand {
  instructor: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  horas: number;
  etapaId: string;
}
