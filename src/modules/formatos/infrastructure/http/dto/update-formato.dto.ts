import { PartialType } from '@nestjs/mapped-types';
import { CreateFormatoDto } from './create-formato.dto';

export class UpdateFormatoDto extends PartialType(CreateFormatoDto) {}
