import {
  Controller, Get, Patch, Body, ParseFloatPipe,
} from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  /** GET /configuracion — devuelve la configuración global */
  @Get()
  getConfig() {
    return this.configuracionService.getConfig();
  }

  /** PATCH /configuracion — actualiza el avance mínimo requerido para crear etapas prácticas */
  @Patch()
  updateConfig(@Body('minAvance', ParseFloatPipe) minAvance: number) {
    return this.configuracionService.updateConfig(minAvance);
  }
}
