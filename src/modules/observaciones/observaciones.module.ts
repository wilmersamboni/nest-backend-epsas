import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionesService } from './application/observaciones.service';
import { ObservacionesController } from './infrastructure/http/observaciones.controller';
import { ObservacionOrmEntity } from './infrastructure/entities/observacion.orm-entity';
import { ObservacionTypeOrmRepository } from './infrastructure/adapters/observacion.typeorm.repository';
import { OBSERVACION_REPOSITORY_PORT } from './domain/ports/observacion.repository.port';

@Module({
  imports: [TypeOrmModule.forFeature([ObservacionOrmEntity])],
  controllers: [ObservacionesController],
  providers: [
    ObservacionesService,
    { provide: OBSERVACION_REPOSITORY_PORT, useClass: ObservacionTypeOrmRepository },
  ],
})
export class ObservacionesModule {}