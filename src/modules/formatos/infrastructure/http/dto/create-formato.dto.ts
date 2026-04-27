import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const TIPOS_FORMATO = [
  'contrato',
  'acta_inicio',
  'acta_seguimiento_1',
  'acta_seguimiento_2',
  'carta_presentacion',
  'paz_y_salvo',
  'certificado',
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
