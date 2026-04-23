import { IsNotEmpty, IsString , IsIn, IsOptional, IsDateString, IsUUID } from "class-validator";

export class CreateSeguimientoDto {

    @IsString()
    @IsOptional()
    actas_pdf?: string;

    @IsIn(['activo', 'inactivo', 'pendiente'])
    @IsOptional()
    estado?: string;

    @IsString()
    @IsOptional()
    observacion: string;

    @IsDateString()
    @IsNotEmpty()
    fecha_inicio:Date;

    @IsDateString()
    @IsNotEmpty()
    fecha_fin: Date

    
    @IsUUID()
    @IsNotEmpty()
    etapaId:string

    @IsUUID()
    @IsNotEmpty()
    asignacionId:string




}
