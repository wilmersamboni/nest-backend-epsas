import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtapaPracticaService } from './application/etapa_practica.service';
import { EtapaPracticaController } from './infrastructure/http/etapa_practica.controller';
import { EtapaPracticaOrmEntity } from './infrastructure/entities/etapa_practica.orm-entity';
import { EtapaPracticaTypeOrmRepository } from './infrastructure/adapters/etapa_practica.typeorm.repository';
import { ETAPA_PRACTICA_REPOSITORY_PORT } from './domain/ports/etapa_practica.repository.port';
import { SeguimientosModule } from 'src/modules/seguimientos/seguimientos.module';
import { BitacorasModule } from 'src/modules/bitacoras/bitacoras.module';
import { AsignacionesModule } from 'src/modules/asignaciones/asignaciones.module';
import { AppCacheService } from 'src/common/cache/app-cache.service'; // ← nuevo

@Module({
  imports: [
    TypeOrmModule.forFeature([EtapaPracticaOrmEntity]),
    SeguimientosModule,
    BitacorasModule,
    AsignacionesModule,
  ],
  controllers: [EtapaPracticaController],
  providers: [
    EtapaPracticaService,
    AppCacheService, // ← nuevo
    { provide: ETAPA_PRACTICA_REPOSITORY_PORT, useClass: EtapaPracticaTypeOrmRepository },
  ],
})
export class EtapaPracticaModule {}