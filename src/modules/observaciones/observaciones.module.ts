import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionesService } from './application/observaciones.service';
import { ObservacionesController } from './infrastructure/http/observaciones.controller';
import { ObservacionOrmEntity } from './infrastructure/entities/observacion.orm-entity';
import { ObservacionTypeOrmRepository } from './infrastructure/adapters/observacion.typeorm.repository';
import { OBSERVACION_REPOSITORY_PORT } from './domain/ports/observacion.repository.port';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([ObservacionOrmEntity])],
  controllers: [ObservacionesController],
  providers: [
    ObservacionesService,
    AppCacheService,
    { provide: OBSERVACION_REPOSITORY_PORT, useClass: ObservacionTypeOrmRepository },
  ],
})
export class ObservacionesModule {}