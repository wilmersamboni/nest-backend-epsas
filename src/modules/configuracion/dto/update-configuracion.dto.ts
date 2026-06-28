import { IsNumber, Max, Min } from 'class-validator';

export class UpdateConfiguracionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  minAvance: number;
}
