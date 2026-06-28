import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Observacion } from '../../domain/entities/observacion.entity';
import {
  IObservacionRepository,
  CreateObservacionData,
} from '../../domain/ports/observacion.repository.port';
import { ObservacionOrmEntity } from '../entities/observacion.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class ObservacionTypeOrmRepository implements IObservacionRepository {
  constructor(
    private readonly cache: AppCacheService,
  ) {}

  private get orm(): Repository<ObservacionOrmEntity> {
    return RequestContextService.getDataSource().getRepository(ObservacionOrmEntity);
  }

  async create(data: CreateObservacionData): Promise<Observacion> {
    const entity = this.orm.create({
      fecha:          data.fecha,
      descripcion:    data.descripcion,
      evidencia_foto: data.evidencia_foto ?? '',
      persona:        data.persona,
      seguimiento:    { id: data.seguimiento.id } as any,
      centroId:       TenantFilter.getCurrentCentroId(),
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

  async findByEtapaId(etapaId: string): Promise<Observacion[]> {
    const qb = this.orm
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.seguimiento', 'seguimiento')
      .innerJoin('seguimiento.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId })
      .orderBy('o.fecha', 'DESC');

    TenantFilter.apply(qb, 'o');
    RlsFilter.applyObservacion(qb, 'o');
    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async findBySeguimientoId(seguimientoId: string): Promise<Observacion[]> {
    const qb = this.orm
      .createQueryBuilder('o')
      .innerJoinAndSelect('o.seguimiento', 'seguimiento')
      .where('seguimiento.id = :seguimientoId', { seguimientoId })
      .orderBy('o.fecha', 'DESC');

    TenantFilter.apply(qb, 'o');
    RlsFilter.applyObservacion(qb, 'o');
    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async save(o: Observacion): Promise<Observacion> {
    const centroId = TenantFilter.getCurrentCentroId();
    await this.orm
      .createQueryBuilder()
      .update(ObservacionOrmEntity)
      .set({
        fecha:          o.fecha,
        descripcion:    o.descripcion,
        evidencia_foto: o.evidencia_foto,
        persona:        o.persona,
      })
      .where('id = :id', { id: o.id })
      .andWhere('centroId = :centroId', { centroId })
      .execute();
    await this.cache.invalidate('observaciones');
    const result = await this.findById(o.id);
    if (!result) throw new NotFoundException(`Observacion con id ${o.id} no encontrada`);
    return result;
  }

  async deleteById(id: string): Promise<number> {
    const centroId = TenantFilter.getCurrentCentroId();
    const affected = (await this.orm.delete({ id, centroId })).affected ?? 0;
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
