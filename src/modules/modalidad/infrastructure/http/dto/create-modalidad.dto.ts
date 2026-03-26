import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class CreateModalidadDto {
    @IsIn(['proyecto productivo', 'pasantia', 'monitoria', 'contrato de aprendizaje'])
    nombre:string
}
