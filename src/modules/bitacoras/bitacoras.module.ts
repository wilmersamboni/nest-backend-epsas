import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacorasService } from './application/bitacoras.service';
import { BitacorasController } from './infrastructure/http/bitacoras.controller';
import { BitacoraOrmEntity } from './infrastructure/entities/bitacora.orm-entity';
import { BitacoraTypeOrmRepository } from './infrastructure/adapters/bitacora.typeorm.repository';
import { BITACORA_REPOSITORY_PORT } from './domain/ports/bitacora.repository.port';

@Module({
  imports: [TypeOrmModule.forFeature([BitacoraOrmEntity])],
  controllers: [BitacorasController],
  exports: [BitacorasService],
  providers: [
    BitacorasService,
    { provide: BITACORA_REPOSITORY_PORT, useClass: BitacoraTypeOrmRepository },
  ],
})
export class BitacorasModule {}