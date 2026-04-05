import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bitacora } from '../../domain/entities/bitacora.entity';
import { IBitacoraRepository } from '../../domain/ports/bitacora.repository.port';
import { BitacoraOrmEntity } from '../entities/bitacora.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class BitacoraTypeOrmRepository implements IBitacoraRepository {
  constructor(
    @InjectRepository(BitacoraOrmEntity)
    private readonly orm: Repository<BitacoraOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(
    data: Partial<Bitacora> & { seguimiento: { id: string } },
  ): Promise<Bitacora> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(),
      seguimiento: data.seguimiento
        ? ({ id: data.seguimiento.id } as any)
        : undefined,
    });
    const saved = await this.orm.save(entity);
    await this.cache.invalidate('bitacoras');
    return this.toDomain(saved);
  }

  async findAll(): Promise<Bitacora[]> {
    const cached = await this.cache.get<Bitacora[]>('bitacoras');
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.seguimiento', 'seguimiento');

    TenantFilter.apply(qb, 'b');
    RlsFilter.applyBitacora(qb, 'b');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('bitacoras', result);
    return result;
  }

  async findById(id: string): Promise<Bitacora | null> {
    const cached = await this.cache.get<Bitacora>('bitacoras', id);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.seguimiento', 'seguimiento')
      .where('b.id = :id', { id });

    TenantFilter.apply(qb, 'b');
    RlsFilter.applyBitacora(qb, 'b');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('bitacoras', result, id);
    return result;
  }

  async save(bitacora: Bitacora): Promise<Bitacora> {
    const result = this.toDomain(await this.orm.save(this.orm.create(bitacora)));
    await this.cache.invalidate('bitacoras');
    return result;
  }

  async deleteById(id: string): Promise<number> {
    const affected = (await this.orm.delete(id)).affected ?? 0;
    await this.cache.invalidate('bitacoras');
    return affected;
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