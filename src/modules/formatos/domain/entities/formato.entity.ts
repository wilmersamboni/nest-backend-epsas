export class Formato {
  id: string;
  centroId: string;
  sedeId: string | null;
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
