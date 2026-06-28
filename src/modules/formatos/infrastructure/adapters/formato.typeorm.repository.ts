import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FormatoOrmEntity } from '../entities/formato.orm-entity';
import { IFormatoRepository } from '../../domain/ports/formato.repository.port';
import { Formato } from '../../domain/entities/formato.entity';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class FormatoTypeormRepository implements IFormatoRepository {
  constructor() {}

  private get orm(): Repository<FormatoOrmEntity> {
    return RequestContextService.getDataSource().getRepository(FormatoOrmEntity);
  }

  private toDomain(orm: FormatoOrmEntity): Formato {
    return {
      id:              orm.id,
      tipo:            orm.tipo,
      nombre:          orm.nombre,
      ruta_archivo:    orm.ruta_archivo,
      nombre_original: orm.nombre_original,
      mime_type:       orm.mime_type,
      tamanio:         orm.tamanio,
      estado:          orm.estado,
      subido_por:      orm.subido_por,
      created_at:      orm.created_at,
      etapa:           orm.etapa ? { id: orm.etapa.id } : undefined,
    };
  }

  async create(data: Partial<Formato>): Promise<Formato> {
    const entity = this.orm.create({
      tipo:            data.tipo,
      nombre:          data.nombre,
      ruta_archivo:    data.ruta_archivo,
      nombre_original: data.nombre_original,
      mime_type:       data.mime_type,
      tamanio:         data.tamanio ?? null,
      estado:          data.estado ?? 'activo',
      subido_por:      data.subido_por ?? null,
      etapa:           data.etapa ? ({ id: data.etapa.id } as any) : undefined,
      centroId:        TenantFilter.getCurrentCentroId(),
      sedeId:          null,
    });
    const saved = await this.orm.save(entity);
    return this.toDomain(saved);
  }

  async findAll(): Promise<Formato[]> {
    const qb = this.orm
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.etapa', 'etapa')
      .orderBy('f.created_at', 'DESC');
    TenantFilter.apply(qb, 'f');
    const rows = await qb.getMany();
    return rows.map(r => this.toDomain(r));
  }

  async findById(id: string): Promise<Formato | null> {
    const qb = this.orm
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.etapa', 'etapa')
      .where('f.id = :id', { id });
    TenantFilter.apply(qb, 'f');
    const row = await qb.getOne();
    return row ? this.toDomain(row) : null;
  }

  async findByEtapaId(etapaId: string): Promise<Formato[]> {
    const qb = this.orm
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId })
      .orderBy('f.created_at', 'DESC');
    TenantFilter.apply(qb, 'f');
    const rows = await qb.getMany();
    return rows.map(r => this.toDomain(r));
  }

  async findByTipo(etapaId: string, tipo: string): Promise<Formato[]> {
    const qb = this.orm
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId })
      .andWhere('f.tipo = :tipo', { tipo })
      .orderBy('f.created_at', 'DESC');
    TenantFilter.apply(qb, 'f');
    const rows = await qb.getMany();
    return rows.map(r => this.toDomain(r));
  }

  async save(formato: Partial<Formato>): Promise<Formato> {
    const centroId = TenantFilter.getCurrentCentroId();
    const toSet: Partial<FormatoOrmEntity> = {};
    if (formato.tipo   !== undefined) toSet.tipo   = formato.tipo;
    if (formato.nombre !== undefined) toSet.nombre = formato.nombre;
    if (formato.estado !== undefined) toSet.estado = formato.estado;

    if (Object.keys(toSet).length > 0) {
      await this.orm
        .createQueryBuilder()
        .update(FormatoOrmEntity)
        .set(toSet)
        .where('id = :id', { id: formato.id })
        .andWhere('centroId = :centroId', { centroId })
        .execute();
    }

    const result = await this.findById(formato.id!);
    if (!result) throw new NotFoundException(`Formato con id ${formato.id} no encontrado`);
    return result;
  }

  async deleteById(id: string): Promise<number> {
    const centroId = TenantFilter.getCurrentCentroId();
    const result = await this.orm.delete({ id, centroId });
    return result.affected ?? 0;
  }

  async updateEstado(id: string, estado: string): Promise<void> {
    const centroId = TenantFilter.getCurrentCentroId();
    await this.orm
      .createQueryBuilder()
      .update(FormatoOrmEntity)
      .set({ estado })
      .where('id = :id', { id })
      .andWhere('centroId = :centroId', { centroId })
      .execute();
  }
}
