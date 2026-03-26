import { IsDate, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateObservacioneDto {
    @IsUUID()
    @IsNotEmpty()
    seguimientoId: string

    @IsDateString()
    @IsNotEmpty()
    fecha:Date;

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
