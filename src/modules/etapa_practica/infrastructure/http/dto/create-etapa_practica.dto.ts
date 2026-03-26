import { IsUUID, IsDateString, IsString, IsNotEmpty,IsIn, IsOptional } from 'class-validator';

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

  @IsIn(['activo', "inactivo", 'suspendido', 'cerificado', 'por certificar'])
  estado: string;

  @IsString()
  @IsOptional()
  observacion: string;
}