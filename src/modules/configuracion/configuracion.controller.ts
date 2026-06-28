import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @Roles('admin', 'docente', 'estudiante')
  getConfig() {
    return this.configuracionService.getConfig();
  }

  @Patch()
  @Roles('admin')
  updateConfig(@Body() dto: UpdateConfiguracionDto) {
    return this.configuracionService.updateConfig(dto.minAvance);
  }
}
