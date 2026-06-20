import { Module } from '@nestjs/common';
import { EtapaPracticaService } from './application/etapa_practica.service';
import { EtapaPracticaController } from './infrastructure/http/etapa_practica.controller';
import { EtapaPracticaTypeOrmRepository } from './infrastructure/adapters/etapa_practica.typeorm.repository';
import { ETAPA_PRACTICA_REPOSITORY_PORT } from './domain/ports/etapa_practica.repository.port';
import { SeguimientosModule } from 'src/modules/seguimientos/seguimientos.module';
import { BitacorasModule } from 'src/modules/bitacoras/bitacoras.module';
import { AsignacionesModule } from 'src/modules/asignaciones/asignaciones.module';
import { AppCacheService } from 'src/common/cache/app-cache.service';
import { ConfiguracionModule } from 'src/modules/configuracion/configuracion.module';

@Module({
  imports: [
    SeguimientosModule,
    BitacorasModule,
    AsignacionesModule,
    ConfiguracionModule,
  ],
  controllers: [EtapaPracticaController],
  providers: [
    EtapaPracticaService,
    AppCacheService,
    { provide: ETAPA_PRACTICA_REPOSITORY_PORT, useClass: EtapaPracticaTypeOrmRepository },
  ],
})
export class EtapaPracticaModule {}
