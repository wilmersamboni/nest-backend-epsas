import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Application
import { EmpresaService } from './application/empresa.service';

// Domain ports (tokens)
import { EMPRESA_REPOSITORY_PORT } from './domain/ports/empresa.repository.port';
import { MUNICIPIO_SERVICE_PORT } from './domain/ports/municipio.service.port';

// Infrastructure
import { EmpresaOrmEntity } from './infrastructure/entities/empresa.orm-entity';
import { EmpresaTypeOrmRepository } from './infrastructure/adapters/empresa.typeorm.repository';
import { MunicipioHttpAdapter } from './infrastructure/adapters/municipio.http.adapter';
import { EmpresaController } from './infrastructure/http/empresa.controller';
import { AppCacheService } from 'src/common/cache/app-cache.service';
 

@Module({
  imports: [
    TypeOrmModule.forFeature([EmpresaOrmEntity]),
    HttpModule,
  ],
  controllers: [EmpresaController],
  providers: [
    EmpresaService,
    AppCacheService, 

    // Adaptador de persistencia → enlazado al puerto del dominio
    {
      provide: EMPRESA_REPOSITORY_PORT,
      useClass: EmpresaTypeOrmRepository,
    },

    // Adaptador HTTP externo → enlazado al puerto del dominio
    {
      provide: MUNICIPIO_SERVICE_PORT,
      useClass: MunicipioHttpAdapter,
    },
  ],
})
export class EmpresaModule {}
