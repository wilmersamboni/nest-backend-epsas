// domain/entities/documento.entity.ts
export class Documento {
  id: string;
  etapaId: string;
  nombre_original: string;
  nombre_archivo: string;
  ruta: string;
  tipo_mime: string;
  tamanio: number;
  creado_en: Date;
}