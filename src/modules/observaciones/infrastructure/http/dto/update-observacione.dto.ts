import { PartialType } from '@nestjs/mapped-types';
import { CreateObservacioneDto } from './create-observacione.dto';

export class UpdateObservacioneDto extends PartialType(CreateObservacioneDto) {}
