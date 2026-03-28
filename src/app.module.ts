import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { EmpresaModule } from './modules/empresa/empresa.module';
import { ModalidadModule } from './modules/modalidad/module';
import { AsignacionesModule } from './modules/asignaciones/asignaciones.module';
import { SeguimientosModule } from './modules/seguimientos/seguimientos.module';
import { BitacorasModule } from './modules/bitacoras/bitacoras.module';
import { ObservacionesModule } from './modules/observaciones/observaciones.module';
import { EtapaPracticaModule } from './modules/etapa_practica/etapa_practica.module';
import { RlsSubscriber } from './database/rls.subscriber';
// RLS
import { JwtExtractorMiddleware } from './common/middleware/jwt-extractor.middleware';
import { RlsGuard } from './common/guards/rls.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
      logging: ['error', 'query']
      
    }),

    EmpresaModule,
    EtapaPracticaModule,
    ModalidadModule,
    AsignacionesModule,
    SeguimientosModule,
    BitacorasModule,
    ObservacionesModule,
  ],
  providers: [
    // Guard global: protege todos los endpoints automáticamente
    {
      provide: APP_GUARD,
      useClass: RlsGuard,
    },
    RlsSubscriber, // Subscriber global: inyecta info del usuario en cada query
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware global: extrae el JWT en cada request
    consumer.apply(JwtExtractorMiddleware).forRoutes('*');
  }
}
