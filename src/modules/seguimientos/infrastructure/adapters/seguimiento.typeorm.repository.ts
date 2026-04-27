import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seguimiento } from '../../domain/entities/seguimiento.entity';
import { ISeguimientoRepository } from '../../domain/ports/seguimiento.repository.port';
import { SeguimientoOrmEntity } from '../entities/seguimiento.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class SeguimientoTypeOrmRepository implements ISeguimientoRepository {
  constructor(
    @InjectRepository(SeguimientoOrmEntity)
    private readonly orm: Repository<SeguimientoOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(data: any): Promise<Seguimiento> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(),
    });
    const saved = await this.orm.save(entity) as unknown as SeguimientoOrmEntity;
    await this.cache.invalidate('seguimientos');
    return this.toDomain(saved);
  }

  async findAll(): Promise<Seguimiento[]> {
    const cached = await this.cache.get<Seguimiento[]>('seguimientos');
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.asignacion', 'asignacion');

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('seguimientos', result);
    return result;
  }

  async findById(id: string): Promise<Seguimiento | null> {
    const cached = await this.cache.get<Seguimiento>('seguimientos', id);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
      .where('s.id = :id', { id });

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('seguimientos', result, id);
    return result;
  }

  async save(seguimiento: Seguimiento): Promise<Seguimiento> {
    // Actualización completa (usada por service.update con DTO parcial).
    // Solo incluye en SET los campos definidos para no sobreescribir con NULL.
    const fields: Partial<SeguimientoOrmEntity> = {};
    if (seguimiento.actas_pdf   !== undefined) fields.actas_pdf   = seguimiento.actas_pdf;
    if (seguimiento.estado      !== undefined) fields.estado      = seguimiento.estado;
    if (seguimiento.observacion !== undefined) fields.observacion = seguimiento.observacion;
    if (seguimiento.fecha_inicio !== undefined) fields.fecha_inicio = seguimiento.fecha_inicio;
    if (seguimiento.fecha_fin    !== undefined) fields.fecha_fin    = seguimiento.fecha_fin;

    if (Object.keys(fields).length > 0) {
      await this.orm
        .createQueryBuilder()
        .update()
        .set(fields)
        .where('id = :id', { id: seguimiento.id })
        .execute();
    }
    await this.cache.invalidate('seguimientos');
    return seguimiento;
  }

  /** Cambia únicamente la columna `estado` — no toca ningún otro campo. */
  async updateEstado(id: string, estado: string): Promise<void> {
    await this.orm
      .createQueryBuilder()
      .update()
      .set({ estado })
      .where('id = :id', { id })
      .execute();
    await this.cache.invalidate('seguimientos');
  }

  /** Guarda únicamente el nombre del archivo de acta — no toca ningún otro campo. */
  async updateActas(id: string, filename: string): Promise<void> {
    await this.orm
      .createQueryBuilder()
      .update()
      .set({ actas_pdf: filename })
      .where('id = :id', { id })
      .execute();
    await this.cache.invalidate('seguimientos');
  }

  async remove(seguimiento: Seguimiento): Promise<void> {
    await this.orm.remove(this.orm.create(seguimiento));
    await this.cache.invalidate('seguimientos');
  }

  async findByEtapaId(etapaId: string): Promise<Seguimiento[]> {
    // Sin caché: se llama al abrir el modal y necesita datos siempre frescos.
    // El caché con sufijo tenía invalidación incompleta (igual que bitácoras).
    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId });

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async findByMatriculaIds(ids: string[]): Promise<Seguimiento[]> {
    const cacheKey = `matriculas:${ids.join(',')}`;
    const cached = await this.cache.get<Seguimiento[]>('seguimientos', cacheKey);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
      .leftJoinAndSelect('s.bitacoras', 'bitacoras')
      .where('etapa.matriculaId IN (:...ids)', { ids });

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('seguimientos', result, cacheKey);
    return result;
  }

  private toDomain(e: SeguimientoOrmEntity): Seguimiento {
    const s = new Seguimiento();
    s.id = e.id;
    s.actas_pdf = e.actas_pdf;
    s.estado = e.estado;
    s.observacion = e.observacion;
    s.fecha_inicio = e.fecha_inicio;
    s.fecha_fin = e.fecha_fin;
    if (e.etapa) s.etapa = { id: e.etapa.id };
    if (e.asignacion) s.asignacion = { id: e.asignacion.id };
    if (e.bitacoras) {
      s.bitacoras = e.bitacoras.map(b => ({
        id: b.id,
        fecha: b.fecha,
        estado: b.estado
      }));
    }

    return s;
  }
}