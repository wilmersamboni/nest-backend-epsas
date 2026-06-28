import { IsDate, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateObservacionParaEtapaDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsUUID()
  @IsNotEmpty()
  persona: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  fecha: Date;
}
