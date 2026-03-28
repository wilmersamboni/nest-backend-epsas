import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asignacion } from '../../domain/entities/asignacion.entity';
import { IAsignacionRepository } from '../../domain/ports/asignacion.repository.port';
import { AsignacionOrmEntity } from '../entities/asignacion.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';

@Injectable()
export class AsignacionTypeOrmRepository implements IAsignacionRepository {
  constructor(
    @InjectRepository(AsignacionOrmEntity)
    private readonly orm: Repository<AsignacionOrmEntity>,
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
    return this.toDomain(Array.isArray(saved) ? saved[0] : saved);
  }

  async findAll(): Promise<Asignacion[]> {
    const qb = this.orm
      .createQueryBuilder('asig')
      .leftJoinAndSelect('asig.etapa', 'etapa');

    TenantFilter.apply(qb, 'asig');       // 1. solo este centro
    RlsFilter.applyAsignacion(qb, 'asig'); // 2. solo lo que el rol ve

    const list = await qb.getMany();
    return list.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Asignacion | null> {
    const qb = this.orm
      .createQueryBuilder('asig')
      .leftJoinAndSelect('asig.etapa', 'etapa')
      .where('asig.id = :id', { id });

    TenantFilter.apply(qb, 'asig');
    RlsFilter.applyAsignacion(qb, 'asig');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  async save(asignacion: Asignacion): Promise<Asignacion> {
    return this.toDomain(await this.orm.save(this.orm.create(asignacion)));
  }

  async deleteById(id: string): Promise<number> {
    const result = await this.orm.delete(id);
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