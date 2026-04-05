import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from '../../domain/entities/empresa.entity';
import { IEmpresaRepository } from '../../domain/ports/empresa.repository.port';
import { EmpresaOrmEntity } from '../entities/empresa.orm-entity';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class EmpresaTypeOrmRepository implements IEmpresaRepository {
  constructor(
    @InjectRepository(EmpresaOrmEntity)
    private readonly ormRepository: Repository<EmpresaOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(data: Partial<Empresa>): Promise<Empresa> {
    const ormEntity = this.ormRepository.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(),
    });
    const saved = await this.ormRepository.save(ormEntity);
    await this.cache.invalidate('empresas');
    return this.toDomain(saved);
  }

  async findAll(): Promise<Empresa[]> {
    const cached = await this.cache.get<Empresa[]>('empresas');
    if (cached) return cached;

    const qb = this.ormRepository.createQueryBuilder('emp');
    TenantFilter.apply(qb, 'emp');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('empresas', result);
    return result;
  }

  async findById(id: string): Promise<Empresa | null> {
    const cached = await this.cache.get<Empresa>('empresas', id);
    if (cached) return cached;

    const qb = this.ormRepository
      .createQueryBuilder('emp')
      .where('emp.id = :id', { id });
    TenantFilter.apply(qb, 'emp');

    const entity = await qb.getOne();
    const result = entity ? this.toDomain(entity) : null;
    if (result) await this.cache.set('empresas', result, id);
    return result;
  }

  async save(empresa: Empresa): Promise<Empresa> {
    const ormEntity = this.ormRepository.create(empresa);
    const saved = await this.ormRepository.save(ormEntity);
    await this.cache.invalidate('empresas');
    return this.toDomain(saved);
  }

  async remove(empresa: Empresa): Promise<void> {
    const ormEntity = this.ormRepository.create(empresa);
    await this.ormRepository.remove(ormEntity);
    await this.cache.invalidate('empresas');
  }

  private toDomain(orm: EmpresaOrmEntity): Empresa {
    const empresa = new Empresa();
    empresa.id = orm.id;
    empresa.nit = orm.nit;
    empresa.nombre = orm.nombre;
    empresa.direccion = orm.direccion;
    empresa.telefono = orm.telefono;
    empresa.correo = orm.correo;
    empresa.municipio = orm.municipio;
    empresa.estado = orm.estado;
    empresa.longitud = orm.longitud;
    empresa.latitud = orm.latitud;
    empresa.tipo = orm.tipo;
    return empresa;
  }
}