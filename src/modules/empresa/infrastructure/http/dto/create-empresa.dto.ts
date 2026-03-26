import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  nit: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  direccion: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  municipio: string;

  @IsOptional()
  @IsIn(['activo', 'inactivo'])
  estado: string;

  @IsString()
  @IsNotEmpty()
  longitud: number;

  @IsString()
  @IsNotEmpty()
  latitud: number;

  @IsIn(['unipersonal', 'empresa'])
  tipo: string;
}
