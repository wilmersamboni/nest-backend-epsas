import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Seguimiento } from '../../domain/entities/seguimiento.entity';
import { ISeguimientoRepository } from '../../domain/ports/seguimiento.repository.port';
import { SeguimientoOrmEntity } from '../entities/seguimiento.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class SeguimientoTypeOrmRepository implements ISeguimientoRepository {
  constructor(
    private readonly cache: AppCacheService,
  ) {}

  private get orm(): Repository<SeguimientoOrmEntity> {
    return RequestContextService.getDataSource().getRepository(SeguimientoOrmEntity);
  }

  async create(
    data: Partial<Seguimiento> & { etapa: { id: string }; asignacion?: { id: string } },
  ): Promise<Seguimiento> {
    const entity = this.orm.create({
      actas_pdf:    data.actas_pdf,
      estado:       data.estado,
      observacion:  data.observacion,
      fecha_inicio: data.fecha_inicio,
      fecha_fin:    data.fecha_fin,
      etapa:        { id: data.etapa.id } as any,
      asignacion:   data.asignacion ? ({ id: data.asignacion.id } as any) : undefined,
      centroId:     TenantFilter.getCurrentCentroId(),
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
      .leftJoinAndSelect('s.etapa', 'etapa')
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
      .leftJoinAndSelect('s.asignacion', 'asignacion')
      .where('s.id = :id', { id });

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('seguimientos', result, id);
    return result;
  }

  async save(seguimiento: Seguimiento): Promise<Seguimiento> {
    const centroId = TenantFilter.getCurrentCentroId();
    const fields: Partial<SeguimientoOrmEntity> = {};
    if (seguimiento.actas_pdf    !== undefined) fields.actas_pdf    = seguimiento.actas_pdf;
    if (seguimiento.estado       !== undefined) fields.estado       = seguimiento.estado;
    if (seguimiento.observacion  !== undefined) fields.observacion  = seguimiento.observacion;
    if (seguimiento.fecha_inicio !== undefined) fields.fecha_inicio = seguimiento.fecha_inicio;
    if (seguimiento.fecha_fin    !== undefined) fields.fecha_fin    = seguimiento.fecha_fin;

    if (Object.keys(fields).length > 0) {
      await this.orm
        .createQueryBuilder()
        .update(SeguimientoOrmEntity)
        .set(fields)
        .where('id = :id', { id: seguimiento.id })
        .andWhere('centroId = :centroId', { centroId })
        .execute();
    }
    await this.cache.invalidate('seguimientos');
    return seguimiento;
  }

  async updateEstado(id: string, estado: string): Promise<void> {
    const centroId = TenantFilter.getCurrentCentroId();
    await this.orm
      .createQueryBuilder()
      .update(SeguimientoOrmEntity)
      .set({ estado })
      .where('id = :id', { id })
      .andWhere('centroId = :centroId', { centroId })
      .execute();
    await this.cache.invalidate('seguimientos');
  }

  async updateActas(id: string, filename: string): Promise<void> {
    const centroId = TenantFilter.getCurrentCentroId();
    await this.orm
      .createQueryBuilder()
      .update(SeguimientoOrmEntity)
      .set({ actas_pdf: filename })
      .where('id = :id', { id })
      .andWhere('centroId = :centroId', { centroId })
      .execute();
    await this.cache.invalidate('seguimientos');
  }

  async remove(seguimiento: Seguimiento): Promise<void> {
    const centroId = TenantFilter.getCurrentCentroId();
    await this.orm.delete({ id: seguimiento.id, centroId });
    await this.cache.invalidate('seguimientos');
  }

  async findByEtapaId(etapaId: string): Promise<Seguimiento[]> {
    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId })
      .orderBy('s.fecha_inicio', 'DESC');

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
        estado: b.estado,
      }));
    }
    return s;
  }
}
