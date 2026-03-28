import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bitacora } from '../../domain/entities/bitacora.entity';
import { IBitacoraRepository } from '../../domain/ports/bitacora.repository.port';
import { BitacoraOrmEntity } from '../entities/bitacora.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';

@Injectable()
export class BitacoraTypeOrmRepository implements IBitacoraRepository {
  constructor(
    @InjectRepository(BitacoraOrmEntity)
    private readonly orm: Repository<BitacoraOrmEntity>,
  ) {}

  async create(
    data: Partial<Bitacora> & { seguimiento: { id: string } },
  ): Promise<Bitacora> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(), // ← tenant inyectado automático
      seguimiento: data.seguimiento
        ? ({ id: data.seguimiento.id } as any)
        : undefined,
    });
    const saved = await this.orm.save(entity);
    return this.toDomain(saved);
  }

  async findAll(): Promise<Bitacora[]> {
    const qb = this.orm
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.seguimiento', 'seguimiento');

    TenantFilter.apply(qb, 'b');       // 1. solo este centro
    RlsFilter.applyBitacora(qb, 'b'); // 2. solo lo que el rol ve

    return (await qb.getMany()).map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Bitacora | null> {
    const qb = this.orm
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.seguimiento', 'seguimiento')
      .where('b.id = :id', { id });

    TenantFilter.apply(qb, 'b');
    RlsFilter.applyBitacora(qb, 'b');

    const e = await qb.getOne();
    return e ? this.toDomain(e) : null;
  }

  async save(bitacora: Bitacora): Promise<Bitacora> {
    return this.toDomain(await this.orm.save(this.orm.create(bitacora)));
  }

  async deleteById(id: string): Promise<number> {
    return (await this.orm.delete(id)).affected ?? 0;
  }

  private toDomain(e: BitacoraOrmEntity): Bitacora {
    const b = new Bitacora();
    b.id = e.id;
    b.fecha = e.fecha;
    b.bitacora_pdf = e.bitacora_pdf;
    b.estado = e.estado;
    if (e.seguimiento) b.seguimiento = { id: e.seguimiento.id };
    return b;
  }
}