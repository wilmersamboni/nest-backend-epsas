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
    const entity = this.orm.create(seguimiento);
    const result = this.toDomain(await this.orm.save(entity));
    await this.cache.invalidate('seguimientos');
    return result;
  }

  async remove(seguimiento: Seguimiento): Promise<void> {
    await this.orm.remove(this.orm.create(seguimiento));
    await this.cache.invalidate('seguimientos');
  }

  async findByMatriculaIds(ids: string[]): Promise<Seguimiento[]> {
    const cacheKey = `matriculas:${ids.join(',')}`;
    const cached = await this.cache.get<Seguimiento[]>('seguimientos', cacheKey);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
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
    return s;
  }
}