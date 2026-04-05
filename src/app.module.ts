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
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppCacheService } from './common/cache/app-cache.service';

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

    CacheModule.registerAsync({
      isGlobal: true
      ,
      useFactory:async () =>({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379'),
          },
          ttl: 60*5
        }),
      }),
    }),
  ],
  providers: [
    // Guard global: protege todos los endpoints automáticamente
    {
      provide: APP_GUARD,
      useClass: RlsGuard,
    },
    RlsSubscriber, // Subscriber global: inyecta info del usuario en cada query
    AppCacheService
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware global: extrae el JWT en cada request
    consumer.apply(JwtExtractorMiddleware).forRoutes('*');
  }
}
