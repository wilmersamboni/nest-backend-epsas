export class Asignacion {
  id: string;
  instructor: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  horas: number;
  etapa?: { id: string };
}