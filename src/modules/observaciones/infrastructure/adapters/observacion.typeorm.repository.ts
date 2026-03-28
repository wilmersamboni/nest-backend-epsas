import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observacion } from '../../domain/entities/observacion.entity';
import { IObservacionRepository } from '../../domain/ports/observacion.repository.port';
import { ObservacionOrmEntity } from '../entities/observacion.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';

@Injectable()
export class ObservacionTypeOrmRepository implements IObservacionRepository {
  constructor(
    @InjectRepository(ObservacionOrmEntity)
    private readonly orm: Repository<ObservacionOrmEntity>,
  ) {}

  async create(data: Partial<ObservacionOrmEntity>): Promise<Observacion> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(), // ← tenant inyectado automático
    });
    const saved = await this.orm.save(entity) as unknown as ObservacionOrmEntity;
    return this.toDomain(saved);
  }

  async findAll(): Promise<Observacion[]> {
    const qb = this.orm
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.seguimiento', 'seguimiento');

    TenantFilter.apply(qb, 'o');         // 1. solo este centro
    RlsFilter.applyObservacion(qb, 'o'); // 2. solo lo que el rol ve

    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Observacion | null> {
    const qb = this.orm
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.seguimiento', 'seguimiento')
      .where('o.id = :id', { id });

    TenantFilter.apply(qb, 'o');
    RlsFilter.applyObservacion(qb, 'o');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  async save(o: Observacion): Promise<Observacion> {
    return this.toDomain(await this.orm.save(this.orm.create(o)));
  }

  async deleteById(id: string): Promise<number> {
    return (await this.orm.delete(id)).affected ?? 0;
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