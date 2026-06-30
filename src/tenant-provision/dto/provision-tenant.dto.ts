import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ProvisionTenantDto {
  /** Slug único del tenant (ej: "sena-bogota") */
  @IsString()
  @IsNotEmpty()
  slug: string;

  /** Nombre de la base de datos de prácticas a crear (ej: "epsas_sena_bogota") */
  @IsString()
  @IsNotEmpty()
  epsasDbName: string;

  /** Host PostgreSQL donde se creará la DB (opcional, usa DB_HOST por defecto) */
  @IsOptional()
  @IsString()
  epsasDbHost?: string;

  /** Puerto PostgreSQL (opcional, usa DB_PORT por defecto) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  epsasDbPort?: number;
}
