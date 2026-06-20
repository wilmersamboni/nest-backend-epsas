import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { EmpresaModule } from './modules/empresa/empresa.module';
import { ModalidadModule } from './modules/modalidad/module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';
import { AsignacionesModule } from './modules/asignaciones/asignaciones.module';
import { SeguimientosModule } from './modules/seguimientos/seguimientos.module';
import { BitacorasModule } from './modules/bitacoras/bitacoras.module';
import { ObservacionesModule } from './modules/observaciones/observaciones.module';
import { EtapaPracticaModule } from './modules/etapa_practica/etapa_practica.module';
import { FormatosModule } from './modules/formatos/formatos.module';
import { DocumentosModule } from './modules/documentos-practica/documento-practica.module';
// RLS
import { JwtExtractorMiddleware } from './common/middleware/jwt-extractor.middleware';
import { RlsGuard } from './common/guards/rls.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppCacheService } from './common/cache/app-cache.service';
import { EpsasDataSourceFactory } from './database/epsas-datasource.factory';

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
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
      logging: ['error', 'query']
    }),

    ConfiguracionModule,
    EmpresaModule,
    EtapaPracticaModule,
    ModalidadModule,
    AsignacionesModule,
    SeguimientosModule,
    BitacorasModule,
    ObservacionesModule,
    FormatosModule,
    DocumentosModule,

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        try {
          const store = await redisStore({
            socket: {
              host: process.env.REDIS_HOST ?? 'localhost',
              port: parseInt(process.env.REDIS_PORT ?? '6379'),
              reconnectStrategy: (retries: number) => {
                if (retries > 20) return false;
                return Math.min(retries * 200, 10_000);
              },
            },
            ttl: 60 * 5,
          });

          const client = (store as any).client;
          if (client) {
            client.on('error', (err: Error) => {
              console.warn('[Redis] error de conexión (se intentará reconectar):', err.message);
            });
          }

          return { store };
        } catch (err) {
          console.warn('[Cache] Redis no disponible, usando caché en memoria:', (err as Error).message);
          return { ttl: 60 * 5 };
        }
      },
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: RlsGuard },
    // RlsSubscriber eliminado: el hook RLS lo registra EpsasDataSourceFactory
    // por cada DataSource de tenant en getDataSource()
    AppCacheService,
    EpsasDataSourceFactory,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtExtractorMiddleware).forRoutes('*');
  }
}
