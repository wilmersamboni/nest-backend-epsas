import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormatoOrmEntity } from '../entities/formato.orm-entity';
import { IFormatoRepository } from '../../domain/ports/formato.repository.port';
import { Formato } from '../../domain/entities/formato.entity';

@Injectable()
export class FormatoTypeormRepository implements IFormatoRepository {
  constructor(
    @InjectRepository(FormatoOrmEntity)
    private readonly repo: Repository<FormatoOrmEntity>,
  ) {}

  // ── Mappers ────────────────────────────────────────────────────────

  private toDomain(orm: FormatoOrmEntity): Formato {
    return {
      id:              orm.id,
      centroId:        orm.centroId,
      sedeId:          orm.sedeId,
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

  // ── Operaciones ────────────────────────────────────────────────────

  async create(data: Partial<Formato>): Promise<Formato> {
    const entity = this.repo.create({
      centroId:        data.centroId,
      sedeId:          data.sedeId ?? null,
      tipo:            data.tipo,
      nombre:          data.nombre,
      ruta_archivo:    data.ruta_archivo,
      nombre_original: data.nombre_original,
      mime_type:       data.mime_type,
      tamanio:         data.tamanio ?? null,
      estado:          data.estado ?? 'activo',
      subido_por:      data.subido_por ?? null,
      etapa:           data.etapa ? ({ id: data.etapa.id } as any) : undefined,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findAll(): Promise<Formato[]> {
    const rows = await this.repo.find({ relations: ['etapa'] });
    return rows.map(r => this.toDomain(r));
  }

  async findById(id: string): Promise<Formato | null> {
    const row = await this.repo.findOne({ where: { id }, relations: ['etapa'] });
    return row ? this.toDomain(row) : null;
  }

  async findByEtapaId(etapaId: string): Promise<Formato[]> {
    const rows = await this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId })
      .orderBy('f.created_at', 'DESC')
      .getMany();
    return rows.map(r => this.toDomain(r));
  }

  async findByTipo(etapaId: string, tipo: string): Promise<Formato[]> {
    const rows = await this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.etapa', 'etapa')
      .where('etapa.id = :etapaId', { etapaId })
      .andWhere('f.tipo = :tipo', { tipo })
      .orderBy('f.created_at', 'DESC')
      .getMany();
    return rows.map(r => this.toDomain(r));
  }

  async save(formato: Partial<Formato>): Promise<Formato> {
    const saved = await this.repo.save(formato as any);
    return this.toDomain(saved);
  }

  async deleteById(id: string): Promise<number> {
    const result = await this.repo.delete(id);
    return result.affected ?? 0;
  }

  async updateEstado(id: string, estado: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(FormatoOrmEntity)
      .set({ estado })
      .where('id = :id', { id })
      .execute();
  }
}
