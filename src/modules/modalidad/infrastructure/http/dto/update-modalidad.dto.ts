import { PartialType } from '@nestjs/mapped-types';
import { CreateModalidadDto } from './create-modalidad.dto';

export class UpdateModalidadDto extends PartialType(CreateModalidadDto) {}
