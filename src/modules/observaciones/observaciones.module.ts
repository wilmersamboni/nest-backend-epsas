import { Module } from '@nestjs/common';
import { ObservacionesService } from './application/observaciones.service';
import { ObservacionesController } from './infrastructure/http/observaciones.controller';
import { ObservacionTypeOrmRepository } from './infrastructure/adapters/observacion.typeorm.repository';
import { OBSERVACION_REPOSITORY_PORT } from './domain/ports/observacion.repository.port';
import { AppCacheService } from 'src/common/cache/app-cache.service';
import { SeguimientosModule } from '../seguimientos/seguimientos.module';

@Module({
  imports: [SeguimientosModule],
  controllers: [ObservacionesController],
  providers: [
    ObservacionesService,
    AppCacheService,
    { provide: OBSERVACION_REPOSITORY_PORT, useClass: ObservacionTypeOrmRepository },
  ],
})
export class ObservacionesModule {}
