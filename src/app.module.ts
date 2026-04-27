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

    ConfiguracionModule,
    EmpresaModule,
    EtapaPracticaModule,
    ModalidadModule,
    AsignacionesModule,
    SeguimientosModule,
    BitacorasModule,
    ObservacionesModule,
    FormatosModule,

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        try {
          const store = await redisStore({
            socket: {
              host: process.env.REDIS_HOST ?? 'localhost',
              port: parseInt(process.env.REDIS_PORT ?? '6379'),
              // Reconectar con backoff exponencial hasta 10 s; null = no reintentar más
              reconnectStrategy: (retries: number) => {
                if (retries > 20) return false;          // deja de reintentar
                return Math.min(retries * 200, 10_000);  // espera hasta 10 s
              },
            },
            ttl: 60 * 5,
          });

          // Silenciar errores de socket para que NO maten el proceso
          const client = (store as any).client;
          if (client) {
            client.on('error', (err: Error) => {
              console.warn('[Redis] error de conexión (se intentará reconectar):', err.message);
            });
          }

          return { store };
        } catch (err) {
          // Redis no disponible al arrancar → caché en memoria como fallback
          console.warn('[Cache] Redis no disponible, usando caché en memoria:', (err as Error).message);
          return { ttl: 60 * 5 };
        }
      },
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
