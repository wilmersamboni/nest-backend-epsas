import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AsignacionesService } from './application/asignaciones.service';
import { AsignacionesController } from './infrastructure/http/asignaciones.controller';
import { AsignacionTypeOrmRepository } from './infrastructure/adapters/asignacion.typeorm.repository';
import { PersonaHttpAdapter } from './infrastructure/adapters/persona.http.adapter';
import { ASIGNACION_REPOSITORY_PORT } from './domain/ports/asignacion.repository.port';
import { PERSONA_SERVICE_PORT } from './domain/ports/persona.service.port';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Module({
  imports: [HttpModule],
  controllers: [AsignacionesController],
  providers: [
    AsignacionesService,
    AppCacheService,
    { provide: ASIGNACION_REPOSITORY_PORT, useClass: AsignacionTypeOrmRepository },
    { provide: PERSONA_SERVICE_PORT, useClass: PersonaHttpAdapter },
  ],
  exports: [AsignacionesService],
})
export class AsignacionesModule {}