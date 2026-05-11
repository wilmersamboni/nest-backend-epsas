// infrastructure/http/dto/upload-documento.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Campos de texto que el frontend puede enviar junto a los archivos.
 * Los archivos en sí los valida Multer (fileFilter + limits).
 */
export class UploadDocumentoDto {

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string; // opcional: el usuario puede etiquetar la subida
}