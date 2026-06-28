import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { Type } from 'class-transformer';

export class CreateObservacioneDto {
    @IsUUID()
    @IsNotEmpty()
    seguimientoId: string

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    fecha: Date;

    @IsString()
    @IsNotEmpty()
    descripcion: string;

    @IsString()
    @IsOptional()
    evidencia_foto: string;

    @IsUUID()
    @IsNotEmpty()
    persona: string
}
