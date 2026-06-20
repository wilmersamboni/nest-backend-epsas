import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RequestContextService } from '../common/rls/request-context';

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

// Forma del objeto que devuelve GET /api/admin/tenants/slug/:slug en el ERP
interface TenantDto {
  id: string;
  nombre: string;
  slug: string;
  dominio: string;
  estado: string;
  epsasDbName: string;
  epsasDbHost?: string;
  epsasDbPort?: number;
}

@Injectable()
export class EpsasDataSourceFactory {
  private readonly dataSources = new Map<string, DataSource>();
  private readonly logger = new Logger(EpsasDataSourceFactory.name);

  async getDataSource(slug: string): Promise<DataSource> {
    if (slug === 'master') {
      throw new BadRequestException("El slug 'master' está reservado");
    }

    const cached = this.dataSources.get(slug);
    if (cached?.isInitialized) return cached;

    const tenant = await this.fetchTenantFromErp(slug);

    if (tenant.estado !== 'activo') {
      throw new NotFoundException(`Tenant '${slug}' no está activo`);
    }

    const dataSource = new DataSource({
      type: 'postgres',
      host:     tenant.epsasDbHost ?? process.env.DB_HOST ?? 'localhost',
      port:     tenant.epsasDbPort ?? parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.EPSAS_DB_USER,
      password: process.env.EPSAS_DB_PASSWORD,
      database: tenant.epsasDbName,
      synchronize: process.env.NODE_ENV !== 'production',
      entities: EPSAS_ENTITIES,
    });

    await dataSource.initialize();

    // Replica el comportamiento de RlsSubscriber: inyecta variables de sesión
    // en cada conexión adquirida del pool para que las políticas RLS funcionen.
    this.registerRlsHook(dataSource, slug);

    this.dataSources.set(slug, dataSource);
    this.logger.log(`DataSource inicializado para tenant '${slug}' → DB: ${tenant.epsasDbName}`);
    return dataSource;
  }

  async closeAll(): Promise<void> {
    for (const [slug, ds] of this.dataSources) {
      if (ds.isInitialized) await ds.destroy();
      this.dataSources.delete(slug);
      this.logger.log(`DataSource cerrado para tenant '${slug}'`);
    }
  }

  // ── HTTP hacia el ERP ───────────────────────────────────────────────────────

  private async fetchTenantFromErp(slug: string): Promise<TenantDto> {
    const base = (process.env.ERP_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const url  = `${base}/api/admin/tenants/slug/${encodeURIComponent(slug)}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      throw new NotFoundException(
        `No se pudo contactar al ERP (${url}): ${(err as Error).message}`,
      );
    }

    if (response.status === 404) {
      throw new NotFoundException(`Tenant '${slug}' no encontrado en el ERP`);
    }

    if (!response.ok) {
      throw new NotFoundException(
        `ERP respondió ${response.status} al consultar el tenant '${slug}'`,
      );
    }

    return response.json() as Promise<TenantDto>;
  }

  // ── RLS pool hook ───────────────────────────────────────────────────────────

  private registerRlsHook(dataSource: DataSource, slug: string): void {
    const pool = (dataSource.driver as any).master;
    if (!pool) {
      this.logger.warn(`[RLS] Pool no encontrado para tenant '${slug}'`);
      return;
    }

    pool.on('acquire', async (client: any) => {
      const user = RequestContextService.getUser();
      if (!user) return;
      try {
        await client.query(
          `SELECT
            set_config('app.current_user_id',   $1, false),
            set_config('app.current_user_rol',  $2, false),
            set_config('app.current_centro_id', $3, false)`,
          [user.sub, user.rol, user.centroId],
        );
      } catch (e) {
        this.logger.warn(`[RLS] acquire hook error (tenant=${slug}): ${(e as Error).message}`);
      }
    });

    this.logger.log(`[RLS] Pool hook registrado para tenant '${slug}'`);
  }
}
