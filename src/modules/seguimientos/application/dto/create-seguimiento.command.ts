export interface CreateSeguimientoCommand {
  actas_pdf?: string;
  estado?: string;
  observacion?: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  etapaId: string;
  asignacionId: string;
}
