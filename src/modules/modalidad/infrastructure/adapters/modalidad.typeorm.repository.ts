import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modalidad } from '../../domain/entities/modalidad.entity';
import { IModalidadRepository } from '../../domain/ports/modalidad.repository.port';
import { ModalidadOrmEntity } from '../entities/modalidad.orm-entity';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class ModalidadTypeOrmRepository implements IModalidadRepository {
  constructor(
    @InjectRepository(ModalidadOrmEntity)
    private readonly orm: Repository<ModalidadOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(data: Partial<Modalidad>): Promise<Modalidad> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(),
    });
    const result = this.toDomain(await this.orm.save(entity));
    await this.cache.invalidate('modalidades');
    return result;
  }

  async findAll(): Promise<Modalidad[]> {
    const cached = await this.cache.get<Modalidad[]>('modalidades');
    if (cached) return cached;

    const qb = this.orm.createQueryBuilder('mod');
    TenantFilter.apply(qb, 'mod');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('modalidades', result);
    return result;
  }

  async findById(id: string): Promise<Modalidad | null> {
    const cached = await this.cache.get<Modalidad>('modalidades', id);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('mod')
      .where('mod.id = :id', { id });
    TenantFilter.apply(qb, 'mod');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('modalidades', result, id);
    return result;
  }

  async save(modalidad: Modalidad): Promise<Modalidad> {
    const result = this.toDomain(await this.orm.save(this.orm.create(modalidad)));
    await this.cache.invalidate('modalidades');
    return result;
  }

  async remove(modalidad: Modalidad): Promise<void> {
    await this.orm.remove(this.orm.create(modalidad));
    await this.cache.invalidate('modalidades');
  }

  private toDomain(e: ModalidadOrmEntity): Modalidad {
    const m = new Modalidad();
    m.id = e.id;
    m.nombre = e.nombre;
    return m;
  }
}