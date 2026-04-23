import { IsDateString, IsIn, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateAsignacioneDto {
    @IsUUID()
    @IsNotEmpty()
    instructor: string;

    @IsDateString()
    @IsNotEmpty()
    fecha_inicio: Date;

    @IsDateString()
    @IsNotEmpty()
    fecha_fin: Date;

    @IsIn(['activo', 'inactivo'])
    estado: string;

    /** Conversión explícita a entero para garantizar que el ValidationPipe
     *  acepte tanto números JSON como strings numéricos del form.  */
    @Type(() => Number)
    @Transform(({ value }) => Math.floor(Number(value)))
    @IsInt()
    @Min(1)
    horas: number;

    @IsUUID()
    @IsNotEmpty()
    etapaId: string;
}
