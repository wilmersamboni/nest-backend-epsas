import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModalidadService } from './application/modalidad.service';
import { ModalidadController } from './infrastructure/http/modalidad.controller';
import { ModalidadOrmEntity } from './infrastructure/entities/modalidad.orm-entity';
import { ModalidadTypeOrmRepository } from './infrastructure/adapters/modalidad.typeorm.repository';
import { MODALIDAD_REPOSITORY_PORT } from './domain/ports/modalidad.repository.port';
import { AppCacheService } from 'src/common/cache/app-cache.service'; // ← nuevo

@Module({
  imports: [TypeOrmModule.forFeature([ModalidadOrmEntity])],
  controllers: [ModalidadController],
  providers: [
    ModalidadService,
    AppCacheService,
    { provide: MODALIDAD_REPOSITORY_PORT, useClass: ModalidadTypeOrmRepository },
  ],
})
export class ModalidadModule {}