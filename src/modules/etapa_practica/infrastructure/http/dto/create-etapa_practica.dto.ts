import {
  IsUUID, IsDateString, IsString, IsNotEmpty,
  IsIn, IsOptional, IsInt, IsNumber, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAsignacionEnEtapaDto {
  @IsUUID()
  @IsNotEmpty()
  instructor: string;

  @IsDateString()
  @IsNotEmpty()
  fecha_inicio: Date;

  @IsDateString()
  @IsNotEmpty()
  fecha_fin: Date;

  @IsIn(['activo', 'inactivo'])
  estado: string;

  @IsInt()
  @IsNotEmpty()
  horas: number;
}

export class CreateEtapaPracticaDto {

  @IsUUID()
  @IsNotEmpty()
  empresaId: string;

  @IsUUID()
  @IsNotEmpty()
  modalidadId: string;

  @IsUUID()
  @IsNotEmpty()
  matriculaId: string;

  @IsDateString()
  @IsNotEmpty()
  fecha_inicio: Date;

  @IsDateString()
  @IsNotEmpty()
  fecha_fin: Date;

  @IsIn(['activo', 'inactivo', 'suspendido', 'certificado', 'por certificar'])
  estado: string;

  @IsString()
  @IsOptional()
  observacion: string;

  /** Asignación de instructor al momento de crear la etapa (opcional) */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAsignacionEnEtapaDto)
  asignacion?: CreateAsignacionEnEtapaDto;

  /**
   * Avance académico actual del aprendiz (0-100).
   * El backend lo compara contra el mínimo configurado y rechaza si no lo cumple.
   */
  @IsOptional()
  @IsNumber()
  avanceMatricula?: number;
}