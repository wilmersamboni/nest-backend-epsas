import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seguimiento } from '../../domain/entities/seguimiento.entity';
import { ISeguimientoRepository } from '../../domain/ports/seguimiento.repository.port';
import { SeguimientoOrmEntity } from '../entities/seguimiento.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';

@Injectable()
export class SeguimientoTypeOrmRepository implements ISeguimientoRepository {
  constructor(
    @InjectRepository(SeguimientoOrmEntity)
    private readonly orm: Repository<SeguimientoOrmEntity>,
  ) {}

  async create(data: any): Promise<Seguimiento> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(), // ← tenant inyectado automático
    });
    const saved = await this.orm.save(entity) as unknown as SeguimientoOrmEntity;
    return this.toDomain(saved);
  }

  async findAll(): Promise<Seguimiento[]> {
    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.asignacion', 'asignacion');

    TenantFilter.apply(qb, 's');         // 1. solo este centro
    RlsFilter.applySeguimiento(qb, 's'); // 2. solo lo que el rol ve

    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Seguimiento | null> {
    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
      .where('s.id = :id', { id });

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  async save(seguimiento: Seguimiento): Promise<Seguimiento> {
    const entity = this.orm.create(seguimiento);
    return this.toDomain(await this.orm.save(entity));
  }

  async remove(seguimiento: Seguimiento): Promise<void> {
    await this.orm.remove(this.orm.create(seguimiento));
  }

  async findByMatriculaIds(ids: string[]): Promise<Seguimiento[]> {
    const qb = this.orm
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.etapa', 'etapa')
      .where('etapa.matriculaId IN (:...ids)', { ids });

    TenantFilter.apply(qb, 's');
    RlsFilter.applySeguimiento(qb, 's');

    return (await qb.getMany()).map((e) => this.toDomain(e));
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