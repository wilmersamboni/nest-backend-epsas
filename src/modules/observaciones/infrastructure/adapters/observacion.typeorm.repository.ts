import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observacion } from '../../domain/entities/observacion.entity';
import { IObservacionRepository } from '../../domain/ports/observacion.repository.port';
import { ObservacionOrmEntity } from '../entities/observacion.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class ObservacionTypeOrmRepository implements IObservacionRepository {
  constructor(
    @InjectRepository(ObservacionOrmEntity)
    private readonly orm: Repository<ObservacionOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(data: Partial<ObservacionOrmEntity>): Promise<Observacion> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(),
    });
    const saved = await this.orm.save(entity) as unknown as ObservacionOrmEntity;
    await this.cache.invalidate('observaciones');
    return this.toDomain(saved);
  }

  async findAll(): Promise<Observacion[]> {
    const cached = await this.cache.get<Observacion[]>('observaciones');
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.seguimiento', 'seguimiento');

    TenantFilter.apply(qb, 'o');
    RlsFilter.applyObservacion(qb, 'o');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('observaciones', result);
    return result;
  }

  async findById(id: string): Promise<Observacion | null> {
    const cached = await this.cache.get<Observacion>('observaciones', id);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.seguimiento', 'seguimiento')
      .where('o.id = :id', { id });

    TenantFilter.apply(qb, 'o');
    RlsFilter.applyObservacion(qb, 'o');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('observaciones', result, id);
    return result;
  }

  async save(o: Observacion): Promise<Observacion> {
    const result = this.toDomain(await this.orm.save(this.orm.create(o)));
    await this.cache.invalidate('observaciones');
    return result;
  }

  async deleteById(id: string): Promise<number> {
    const affected = (await this.orm.delete(id)).affected ?? 0;
    await this.cache.invalidate('observaciones');
    return affected;
  }

  private toDomain(e: ObservacionOrmEntity): Observacion {
    const o = new Observacion();
    o.id = e.id;
    o.fecha = e.fecha;
    o.descripcion = e.descripcion;
    o.evidencia_foto = e.evidencia_foto;
    o.persona = e.persona;
    if (e.seguimiento) o.seguimiento = { id: e.seguimiento.id };
    return o;
  }
}