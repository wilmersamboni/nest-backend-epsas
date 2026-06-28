export interface CreateObservacionCommand {
  seguimientoId: string;
  fecha: Date;
  descripcion: string;
  evidencia_foto?: string;
  persona: string;
}

export interface CreateObservacionParaEtapaCommand {
  descripcion: string;
  persona: string;
  fecha: Date;
}
