import { PartialType } from '@nestjs/mapped-types';
import { CreateEtapaPracticaDto } from './create-etapa_practica.dto';

export class UpdateEtapaPracticaDto extends PartialType(CreateEtapaPracticaDto) {}
