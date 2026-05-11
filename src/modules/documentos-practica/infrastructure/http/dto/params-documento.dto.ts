// infrastructure/http/dto/params-documento.dto.ts
import { IsUUID } from 'class-validator';

export class EtapaParamsDto {
  @IsUUID()
  etapaId: string;
}

export class DocumentoParamsDto extends EtapaParamsDto {
  @IsUUID()
  documentoId: string;
}