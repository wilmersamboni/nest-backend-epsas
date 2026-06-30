import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/roles.decorator';
import { TenantProvisionService } from './tenant-provision.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';

/**
 * Endpoint interno usado exclusivamente por backend-epsas para provisionar
 * la base de datos de prácticas cuando se crea un nuevo tenant.
 *
 * Protegido por x-api-key (variable PRACTICA_INTERNAL_KEY en .env).
 * Marcado @Public() para saltarse el guard JWT global.
 */
@Public()
@Controller('internal/tenants')
export class TenantProvisionController {
  private readonly logger = new Logger(TenantProvisionController.name);

  constructor(
    private readonly provisionService: TenantProvisionService,
    private readonly config: ConfigService,
  ) {}

  @Post('provision')
  async provision(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: ProvisionTenantDto,
  ) {
    const expected = this.config.get<string>('PRACTICA_INTERNAL_KEY');
    if (!expected || apiKey !== expected) {
      this.logger.warn(`[Provision] Intento con API key inválida para tenant '${dto.slug}'`);
      throw new UnauthorizedException('API key de servicio inválida');
    }

    return this.provisionService.provision(dto);
  }
}
