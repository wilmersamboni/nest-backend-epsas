import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Empresa } from '../../domain/entities/empresa.entity';
import { IEmpresaRepository } from '../../domain/ports/empresa.repository.port';
import { EmpresaOrmEntity } from '../entities/empresa.orm-entity';
import { TenantFilter } from 'src/common/filters/tenant.filter';

@Injectable()
export class EmpresaTypeOrmRepository implements IEmpresaRepository {
  constructor(
    @InjectRepository(EmpresaOrmEntity)
    private readonly ormRepository: Repository<EmpresaOrmEntity>,
  ) {}

  async create(data: Partial<Empresa>): Promise<Empresa> {
    const ormEntity = this.ormRepository.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(), // ← tenant inyectado automático
    });
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomain(saved);
  }

  async findAll(): Promise<Empresa[]> {
    // Empresa no tiene RlsFilter (todos los roles ven empresas del centro)
    // solo se filtra por tenant
    const qb = this.ormRepository.createQueryBuilder('emp');
    TenantFilter.apply(qb, 'emp');
    const entities = await qb.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findById(id: string): Promise<Empresa | null> {
    const qb = this.ormRepository
      .createQueryBuilder('emp')
      .where('emp.id = :id', { id });
    TenantFilter.apply(qb, 'emp');
    const entity = await qb.getOne();
    return entity ? this.toDomain(entity) : null;
  }

  async save(empresa: Empresa): Promise<Empresa> {
    const ormEntity = this.ormRepository.create(empresa);
    const saved = await this.ormRepository.save(ormEntity);
    return this.toDomain(saved);
  }

  async remove(empresa: Empresa): Promise<void> {
    const ormEntity = this.ormRepository.create(empresa);
    await this.ormRepository.remove(ormEntity);
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