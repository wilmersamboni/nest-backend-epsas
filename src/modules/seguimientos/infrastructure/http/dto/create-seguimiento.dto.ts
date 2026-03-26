import { IsNotEmpty, IsString , IsIn, IsOptional, IsDateString, IsUUID } from "class-validator";

export class CreateSeguimientoDto {

    @IsString()
    @IsNotEmpty()
    actas_pdf:string;

    @IsIn(['actvivo', 'inactivo', 'pendiente'])
    estado: string;

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
