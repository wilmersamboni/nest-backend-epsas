import { IsDate, IsNotEmpty, IsString, IsIn, IsOptional, IsUUID } from "class-validator";
import { Type } from 'class-transformer';

export class CreateSeguimientoDto {

    @IsString()
    @IsOptional()
    actas_pdf?: string;

    @IsIn(['activo', 'inactivo', 'pendiente'])
    @IsOptional()
    estado?: string;

    @IsString()
    @IsOptional()
    observacion?: string;

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    fecha_inicio: Date;

    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    fecha_fin: Date;

    @IsUUID()
    @IsNotEmpty()
    etapaId: string;

    @IsUUID()
    @IsNotEmpty()
    asignacionId: string;
}
