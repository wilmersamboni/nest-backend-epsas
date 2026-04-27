import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { FormatoOrmEntity } from './infrastructure/entities/formato.orm-entity';
import { FormatoTypeormRepository } from './infrastructure/adapters/formato.typeorm.repository';
import { FORMATO_REPOSITORY_PORT } from './domain/ports/formato.repository.port';
import { FormatosService } from './application/formatos.service';
import { FormatosController } from './infrastructure/http/formatos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormatoOrmEntity]),
    MulterModule.register({ dest: './uploads/formatos' }),
  ],
  controllers: [FormatosController],
  providers: [
    FormatosService,
    {
      provide:  FORMATO_REPOSITORY_PORT,
      useClass: FormatoTypeormRepository,
    },
  ],
  exports: [FormatosService],
})
export class FormatosModule {}
