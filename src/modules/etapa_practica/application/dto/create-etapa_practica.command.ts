export interface CreateAsignacionEnEtapaCommand {
  instructor: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  horas: number;
}

export interface CreateEtapaPracticaCommand {
  empresaId: string;
  modalidadId: string;
  matriculaId: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  observacion?: string;
  asignacion?: CreateAsignacionEnEtapaCommand;
  avanceMatricula?: number;
}
