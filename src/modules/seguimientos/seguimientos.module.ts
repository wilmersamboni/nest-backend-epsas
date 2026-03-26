import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SeguimientosService } from './application/seguimientos.service';
import { SeguimientosController } from './infrastructure/http/seguimientos.controller';
import { SeguimientoOrmEntity } from './infrastructure/entities/seguimiento.orm-entity';
import { SeguimientoTypeOrmRepository } from './infrastructure/adapters/seguimiento.typeorm.repository';
import { MatriculaHttpAdapter } from './infrastructure/adapters/matricula.http.adapter';
import { SEGUIMIENTO_REPOSITORY_PORT } from './domain/ports/seguimiento.repository.port';
import { MATRICULA_SERVICE_PORT } from './domain/ports/matricula.service.port';

@Module({
  imports: [TypeOrmModule.forFeature([SeguimientoOrmEntity]), HttpModule],
  controllers: [SeguimientosController],
  providers: [
    SeguimientosService,
    { provide: SEGUIMIENTO_REPOSITORY_PORT, useClass: SeguimientoTypeOrmRepository },
    { provide: MATRICULA_SERVICE_PORT, useClass: MatriculaHttpAdapter },
  ],
  // ⬇️ exportamos el service para que etapa_practica lo pueda inyectar
  exports: [SeguimientosService],
})
export class SeguimientosModule {}