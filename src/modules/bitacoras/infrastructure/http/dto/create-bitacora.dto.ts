import { IsDate, IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";
import { Type } from 'class-transformer';

export class CreateBitacoraDto {
    @Type(() => Date)
    @IsDate()
    fecha: Date;

    @IsString()
    @IsNotEmpty()
    bitacora_pdf:string;

    @IsIn(['aceptada', 'rechazada', 'pendiente'])
    estado: string;

    @IsUUID()
    @IsNotEmpty()
    seguimientoId: string;
}
