import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { DataSource } from 'typeorm';

import { ProvisionTenantDto } from './dto/provision-tenant.dto';

// Importamos las entidades ORM propias de este proyecto
import { AsignacionOrmEntity }    from '../modules/asignaciones/infrastructure/entities/asignacion.orm-entity';
import { BitacoraOrmEntity }      from '../modules/bitacoras/infrastructure/entities/bitacora.orm-entity';
import { DocumentoOrmEntity }     from '../modules/documentos-practica/infrastructure/entities/documento-practica.orm-entity';
import { EmpresaOrmEntity }       from '../modules/empresa/infrastructure/entities/empresa.orm-entity';
import { EtapaPracticaOrmEntity } from '../modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';
import { FormatoOrmEntity }       from '../modules/formatos/infrastructure/entities/formato.orm-entity';
import { ModalidadOrmEntity }     from '../modules/modalidad/infrastructure/entities/modalidad.orm-entity';
import { ObservacionOrmEntity }   from '../modules/observaciones/infrastructure/entities/observacion.orm-entity';
import { SeguimientoOrmEntity }   from '../modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { ConfiguracionPractica }  from '../modules/configuracion/configuracion.entity';

const PRACTICA_ENTITIES = [
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
export class TenantProvisionService {
  private readonly logger = new Logger(TenantProvisionService.name);

  constructor(private readonly config: ConfigService) {}

  async provision(dto: ProvisionTenantDto): Promise<{ mensaje: string }> {
    const host = dto.epsasDbHost ?? this.config.get<string>('DB_HOST', 'localhost');
    const port = dto.epsasDbPort ?? parseInt(this.config.get<string>('DB_PORT', '5432'));
    const dbName = dto.epsasDbName;

    this.logger.log(`[Provision] Iniciando provisioning para tenant '${dto.slug}' → DB '${dbName}'`);

    // 1. Crear la base de datos si no existe
    await this.crearBaseDeDatos(host, port, dbName);

    // 2. Abrir DataSource con las entidades de prácticas y sincronizar esquema
    const ds = new DataSource({
      type: 'postgres',
      host,
      port,
      username: this.config.get<string>('DB_USERNAME'),
      password: this.config.get<string>('DB_PASSWORD'),
      database: dbName,
      synchronize: true,          // crea/actualiza tablas automáticamente
      logging: false,
      entities: PRACTICA_ENTITIES,
    });

    await ds.initialize();

    try {
      // 3. Sembrar fila única de configuración si no existe
      const configRepo = ds.getRepository(ConfiguracionPractica);
      const yaExiste = await configRepo.findOne({ where: { id: 1 } });
      if (!yaExiste) {
        await configRepo.save(configRepo.create({ id: 1, min_avance: 70 }));
        this.logger.log(`[Provision] Configuración por defecto sembrada para '${dto.slug}'`);
      }
    } finally {
      await ds.destroy();
    }

    this.logger.log(`[Provision] DB de prácticas '${dbName}' lista para tenant '${dto.slug}'`);
    return { mensaje: `DB de prácticas '${dbName}' provisionada correctamente para tenant '${dto.slug}'` };
  }

  /**
   * Crea la base de datos si no existe. Idempotente.
   * Se conecta a la DB 'postgres' para poder ejecutar CREATE DATABASE.
   */
  private async crearBaseDeDatos(host: string, port: number, dbName: string): Promise<void> {
    const safeName = dbName.replace(/[^a-zA-Z0-9_]/g, '');
    if (safeName !== dbName) {
      throw new ConflictException(`Nombre de DB inválido: '${dbName}'. Solo letras, números y guiones bajos.`);
    }

    const client = new Client({
      host,
      port,
      user:     this.config.get<string>('DB_USERNAME'),
      password: this.config.get<string>('DB_PASSWORD'),
      database: 'postgres',
    });

    await client.connect();
    try {
      const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (res.rows.length === 0) {
        await client.query(`CREATE DATABASE "${safeName}"`);
        this.logger.log(`[Provision] Base de datos '${dbName}' creada`);
      } else {
        this.logger.log(`[Provision] Base de datos '${dbName}' ya existe, se omite creación`);
      }
    } finally {
      await client.end();
    }
  }
}
