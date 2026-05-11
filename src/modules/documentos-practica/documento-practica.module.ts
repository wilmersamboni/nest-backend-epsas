// documentos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentoOrmEntity } from './infrastructure/entities/documento-practica.orm-entity';
import { DocumentoTypeOrmRepository } from './infrastructure/adapters/documento-practica.typeorm.repository';
import { DOCUMENTO_REPOSITORY_PORT } from './domain/ports/documento-practica.repository';
import { DocumentosService } from './application/documento-practica.service';
import { DocumentosController } from './infrastructure/http/documento-practica.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentoOrmEntity]),
    MulterModule.register({ dest: './uploads/documentos' }),
  ],
  controllers: [DocumentosController],
  providers: [
    DocumentosService,
    {
      provide:  DOCUMENTO_REPOSITORY_PORT,
      useClass: DocumentoTypeOrmRepository,
    },
  ],
  exports: [DocumentosService],
})
export class DocumentosModule {}