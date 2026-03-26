import { IsDate, IsDateString, IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class CreateBitacoraDto {
    @IsDateString()
    @IsNotEmpty()
    fecha:Date;

    @IsString()
    @IsNotEmpty()
    bitacora_pdf:string;

    @IsIn(['aceptada', 'rechazada', 'pendiente'])
    estado: string;

    @IsUUID()
    @IsNotEmpty()
    seguimientoId: string;
}
