import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asignacion } from '../../domain/entities/asignacion.entity';
import { IAsignacionRepository } from '../../domain/ports/asignacion.repository.port';
import { AsignacionOrmEntity } from '../entities/asignacion.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class AsignacionTypeOrmRepository implements IAsignacionRepository {
  constructor(
    @InjectRepository(AsignacionOrmEntity)
    private readonly orm: Repository<AsignacionOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(
    data: Partial<Asignacion> & { etapa: { id: string } },
  ): Promise<Asignacion> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(), // ← tenant inyectado automático
      etapa: data.etapa ? ({ id: data.etapa.id } as any) : undefined,
    });
    const saved = await this.orm.save(entity);
    await this.cache.invalidate('asignaciones'); // ← invalida caché al crear
    return this.toDomain(Array.isArray(saved) ? saved[0] : saved);
  }

  async findAll(): Promise<Asignacion[]> {
    const cached = await this.cache.get<Asignacion[]>('asignaciones');
    if (cached) return cached;
    const qb = this.orm
      .createQueryBuilder('asig')
      .leftJoinAndSelect('asig.etapa', 'etapa');

    TenantFilter.apply(qb, 'asig');       // 1. solo este centro
    RlsFilter.applyAsignacion(qb, 'asig'); // 2. solo lo que el rol ve

    const list = await qb.getMany();
    await this.cache.set('asignaciones', list);
    return list.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Asignacion | null> {
    const cached = await this.cache.get<Asignacion>('asignaciones', id);
    if (cached) return cached;


    const qb = this.orm
      .createQueryBuilder('asig')
      .leftJoinAndSelect('asig.etapa', 'etapa')
      .where('asig.id = :id', { id });

    TenantFilter.apply(qb, 'asig');
    RlsFilter.applyAsignacion(qb, 'asig');

    const e = await qb.getOne();
    if (e) await this.cache.set('asignaciones', this.toDomain(e), id);
    return e ? this.toDomain(e) : null;
  }

  async findByEtapaId(etapaId: string): Promise<Asignacion[]> {
    const cached = await this.cache.get<Asignacion[]>('asignaciones', `etapa:${etapaId}`);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('asig')
      .leftJoinAndSelect('asig.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId });

    TenantFilter.apply(qb, 'asig');

    const list = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('asignaciones', list, `etapa:${etapaId}`);
    return list;
  }

  async save(asignacion: Asignacion): Promise<Asignacion> {
    const saved = this.toDomain(await this.orm.save(this.orm.create(asignacion)));
    await this.cache.invalidate('asignaciones');
    return saved;
  }

  async deleteById(id: string): Promise<number> {
    const result = await this.orm.delete(id);
    await this.cache.invalidate('asignaciones'); // ← invalida caché al eliminar
    return result.affected ?? 0;
  }

  private toDomain(e: AsignacionOrmEntity): Asignacion {
    const a = new Asignacion();
    a.id = e.id;
    a.instructor = e.instructor;
    a.fecha_inicio = e.fecha_inicio;
    a.fecha_fin = e.fecha_fin;
    a.estado = e.estado;
    a.horas = e.horas;
    if (e.etapa) a.etapa = { id: e.etapa.id };
    return a;
  }
}