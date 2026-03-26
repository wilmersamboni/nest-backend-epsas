export class Observacion {
  id: string;
  fecha: Date;
  descripcion: string;
  evidencia_foto: string;
  persona: string;
  seguimiento?: { id: string };
}