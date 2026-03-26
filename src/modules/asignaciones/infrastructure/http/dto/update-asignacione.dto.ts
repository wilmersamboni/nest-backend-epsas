import { PartialType } from '@nestjs/mapped-types';
import { CreateAsignacioneDto } from './create-asignacione.dto';

export class UpdateAsignacioneDto extends PartialType(CreateAsignacioneDto) {}
