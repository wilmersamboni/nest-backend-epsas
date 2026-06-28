import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsNumberString,
} from 'class-validator';
import { Transform } from 'class-transformer';

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

  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  municipio: string;

  @IsOptional()
  @IsIn(['activo', 'inactivo'])
  estado: string;

  @IsOptional()
  @Transform(({ value }) => value !== '' && value != null ? parseFloat(value) : undefined)
  @IsNumber({}, { message: 'longitud debe ser un número' })
  @Min(-180, { message: 'longitud mínima: -180' })
  @Max(180,  { message: 'longitud máxima: 180'  })
  longitud?: number;

  @IsOptional()
  @Transform(({ value }) => value !== '' && value != null ? parseFloat(value) : undefined)
  @IsNumber({}, { message: 'latitud debe ser un número' })
  @Min(-90, { message: 'latitud mínima: -90' })
  @Max(90,  { message: 'latitud máxima: 90'  })
  latitud?: number;

  @IsIn(['unipersonal', 'empresa'])
  tipo: string;
}
