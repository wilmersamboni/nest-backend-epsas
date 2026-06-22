import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import { RlsSubscriber } from './rls.subscriber';

// ── Entidades ORM de EPSAS ────────────────────────────────────────────────────
import { AsignacionOrmEntity }     from '../modules/asignaciones/infrastructure/entities/asignacion.orm-entity';
import { BitacoraOrmEntity }       from '../modules/bitacoras/infrastructure/entities/bitacora.orm-entity';
import { DocumentoOrmEntity }      from '../modules/documentos-practica/infrastructure/entities/documento-practica.orm-entity';
import { EmpresaOrmEntity }        from '../modules/empresa/infrastructure/entities/empresa.orm-entity';
import { EtapaPracticaOrmEntity }  from '../modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';
import { FormatoOrmEntity }        from '../modules/formatos/infrastructure/entities/formato.orm-entity';
import { ModalidadOrmEntity }      from '../modules/modalidad/infrastructure/entities/modalidad.orm-entity';
import { ObservacionOrmEntity }    from '../modules/observaciones/infrastructure/entities/observacion.orm-entity';
import { SeguimientoOrmEntity }    from '../modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { ConfiguracionPractica }   from '../modules/configuracion/configuracion.entity';

const EPSAS_ENTITIES = [
  AsignacionOrmEntity,
  BitacoraOrmEntity,
  DocumentoOrmEntity,
  EmpresaOrmEntity,
  EtapaPracticaOrmEntity,
  FormatoOrmEntity,
  ModalidadOrmEntity,
  ObservacionOrmEntity,
  SeguimientoOrmEntity,
  ConfiguracionPractica,
];

@Injectable()
export class EpsasDataSourceFactory {
  private readonly logger = new Logger(EpsasDataSourceFactory.name);
  private readonly dataSources = new Map<string, DataSource>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getDataSource(slug: string, token?: string): Promise<DataSource> {
    const cached = this.dataSources.get(slug);
    if (cached) return cached;

    const baseUrl = this.config.get<string>('ERP_API_URL');
    let tenant: any;

    try {
      // Preferir token de servicio (ERP_SERVICE_TOKEN) para la llamada
      // servicio-a-servicio. Si no está configurado, reenviar el JWT del usuario.
      const serviceToken = this.config.get<string>('ERP_SERVICE_TOKEN');
      const authToken = serviceToken ?? token;
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const response = await firstValueFrom(
        this.http.get(`${baseUrl}/admin/tenants/slug/${slug}`, { headers }),
      );
      tenant = response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new NotFoundException(`Tenant no encontrado: ${slug}`);
      }
      throw err;
    }

    if (!tenant || tenant.activo === false) {
      throw new NotFoundException(`Tenant no encontrado: ${slug}`);
    }

    const ds = new DataSource({
      type: 'postgres',
      host:     tenant.epsasDbHost ?? this.config.get<string>('DB_HOST'),
      port:     tenant.epsasDbPort ?? parseInt(this.config.get<string>('DB_PORT') ?? '5432'),
      username: this.config.get<string>('DB_USERNAME'),
      password: this.config.get<string>('DB_PASSWORD'),
      database: tenant.epsasDbName,
      synchronize: this.config.get<string>('NODE_ENV') !== 'production',
      entities: EPSAS_ENTITIES,
    });

    await ds.initialize();

    // Instanciamos RlsSubscriber pasándole directamente el DataSource del tenant.
    // @InjectDataSource() es solo metadato de DI — en runtime el constructor
    // recibe ds y llama hookConnectionPool() sobre el pool de esta conexión.
    new (RlsSubscriber as any)(ds);

    this.dataSources.set(slug, ds);
    this.logger.log(`DataSource inicializado para tenant: ${slug}`);
    return ds;
  }

  async closeAll(): Promise<void> {
    for (const [slug, ds] of this.dataSources) {
      if (ds.isInitialized) {
        await ds.destroy();
        this.logger.log(`DataSource destruido para tenant: ${slug}`);
      }
    }
    this.dataSources.clear();
  }
}
