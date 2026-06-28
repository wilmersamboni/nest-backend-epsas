export class Formato {
  id: string;
  tipo: string;
  nombre: string;
  ruta_archivo: string;
  nombre_original: string;
  mime_type: string;
  tamanio: number | null;
  estado: string;
  subido_por: string | null;
  created_at: Date;
  etapa?: { id: string };
}
