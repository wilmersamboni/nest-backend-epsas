import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const TIPOS_FORMATO = [
  'acta_seguimiento',
  'bitacora',
  'otro',
] as const;

export type TipoFormato = (typeof TIPOS_FORMATO)[number];

export class CreateFormatoDto {
  @IsUUID()
  @IsOptional()
  etapaId?: string;

  @IsIn(TIPOS_FORMATO, {
    message: `tipo debe ser uno de: ${TIPOS_FORMATO.join(', ')}`,
  })
  tipo: TipoFormato;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  estado?: string;
}
