import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacorasService } from './application/bitacoras.service';
import { BitacorasController } from './infrastructure/http/bitacoras.controller';
import { BitacoraOrmEntity } from './infrastructure/entities/bitacora.orm-entity';
import { BitacoraTypeOrmRepository } from './infrastructure/adapters/bitacora.typeorm.repository';
import { BITACORA_REPOSITORY_PORT } from './domain/ports/bitacora.repository.port';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([BitacoraOrmEntity])],
  controllers: [BitacorasController],
  exports: [BitacorasService],
  providers: [
    BitacorasService,
    AppCacheService,
    { provide: BITACORA_REPOSITORY_PORT, useClass: BitacoraTypeOrmRepository },
  ],
})
export class BitacorasModule {}