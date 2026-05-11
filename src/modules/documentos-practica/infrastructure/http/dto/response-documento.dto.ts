// infrastructure/http/dto/response-documento.dto.ts

/**
 * Shape exacta que ve el frontend al listar o subir documentos.
 * No extiende PartialType porque no es para recibir datos sino para enviarlos.
 */
export class ResponseDocumentoDto {
  id: string;
  etapaId: string;
  nombre_original: string; // "Contrato empresa.pdf"  ← el usuario lo ve
  tipo_mime: string;       // "application/pdf"
  tamanio: number;         // 204800  (bytes)
  creado_en: Date;

  // ⚠️ nombre_archivo y ruta NO se exponen:
  // son rutas internas del servidor, el frontend no las necesita
  // y exponerlas sería un riesgo de seguridad (path disclosure)
}