export class Seguimiento {
  id: string;
  actas_pdf: string;
  estado: string;
  observacion: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  etapa?: { id: string };
  asignacion?: { id: string };
}