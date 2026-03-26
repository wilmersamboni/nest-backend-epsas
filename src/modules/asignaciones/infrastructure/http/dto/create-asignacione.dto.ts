import { IsDateString, IsIn, IsInt, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateAsignacioneDto {
    @IsUUID()
    @IsNotEmpty()
    instructor:string;

    @IsDateString()
    @IsNotEmpty()
    fecha_inicio:Date;

    @IsDateString()
    @IsNotEmpty()
    fecha_fin:Date;

    @IsIn(['activo', 'inactivo'])
    estado:string;

    @IsInt()
    @IsNotEmpty()
    horas: number;

    @IsUUID()
    @IsNotEmpty()
    etapaId: string;

}
