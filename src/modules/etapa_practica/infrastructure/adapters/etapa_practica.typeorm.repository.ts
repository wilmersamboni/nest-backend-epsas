import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtapaPractica } from '../../domain/entities/etapa_practica.entity';
import { IEtapaPracticaRepository } from '../../domain/ports/etapa_practica.repository.port';
import { EtapaPracticaOrmEntity } from '../entities/etapa_practica.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';

@Injectable()
export class EtapaPracticaTypeOrmRepository implements IEtapaPracticaRepository {
  constructor(
    @InjectRepository(EtapaPracticaOrmEntity)
    private readonly orm: Repository<EtapaPracticaOrmEntity>,
  ) {}

  async create(data: any): Promise<EtapaPractica> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(), // ← tenant inyectado automático
    });
    const saved = await this.orm.save(entity) as unknown as EtapaPracticaOrmEntity;
    return this.toDomain(saved);
  }

  async findAll(): Promise<EtapaPractica[]> {
    const qb = this.orm
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.empresa', 'empresa')
      .leftJoinAndSelect('ep.modalidad', 'modalidad')
      .orderBy('ep.fecha_inicio', 'DESC');

    TenantFilter.apply(qb, 'ep');            // 1. solo este centro
    RlsFilter.applyEtapaPractica(qb, 'ep'); // 2. solo lo que el rol ve

    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<EtapaPractica | null> {
    const qb = this.orm
      .createQueryBuilder('ep')
      .where('ep.id = :id', { id });

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  async findByIdWithRelations(id: string): Promise<EtapaPractica | null> {
    const qb = this.orm
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.empresa', 'empresa')
      .leftJoinAndSelect('ep.modalidad', 'modalidad')
      .where('ep.id = :id', { id });

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  async save(etapa: EtapaPractica): Promise<EtapaPractica> {
    // save no toca centroId — ya fue asignado en el create
    const entity = this.orm.create(etapa);
    return this.toDomain(await this.orm.save(entity));
  }

  async deleteById(id: string): Promise<number> {
    return (await this.orm.delete(id)).affected ?? 0;
  }

  async updateObservacion(id: string, observacion: string): Promise<void> {
    await this.orm
      .createQueryBuilder()
      .update()
      .set({ observacion })
      .where('id = :id', { id })
      .execute();
  }

  async findByMatriculaId(matriculaId: string): Promise<EtapaPractica | null> {
    const qb = this.orm
      .createQueryBuilder('ep')
      .where('ep.matriculaId = :matriculaId', { matriculaId });

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  private toDomain(e: EtapaPracticaOrmEntity): EtapaPractica {
    const p = new EtapaPractica();
    p.id = e.id;
    p.matriculaId = e.matriculaId;
    p.fecha_inicio = e.fecha_inicio;
    p.fecha_fin = e.fecha_fin;
    p.estado = e.estado;
    p.observacion = e.observacion;
    if (e.empresa)   p.empresa   = { id: e.empresa.id };
    if (e.modalidad) p.modalidad = { id: e.modalidad.id };
    return p;
  }
}