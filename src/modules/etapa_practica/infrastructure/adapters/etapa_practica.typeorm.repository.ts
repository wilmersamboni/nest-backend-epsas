import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtapaPractica } from '../../domain/entities/etapa_practica.entity';
import { IEtapaPracticaRepository } from '../../domain/ports/etapa_practica.repository.port';
import { EtapaPracticaOrmEntity } from '../entities/etapa_practica.orm-entity';
import { RlsFilter } from 'src/common/filters/rls.filter';
import { TenantFilter } from 'src/common/filters/tenant.filter';
import { AppCacheService } from 'src/common/cache/app-cache.service';

@Injectable()
export class EtapaPracticaTypeOrmRepository implements IEtapaPracticaRepository {
  constructor(
    @InjectRepository(EtapaPracticaOrmEntity)
    private readonly orm: Repository<EtapaPracticaOrmEntity>,
    private readonly cache: AppCacheService,
  ) {}

  async create(data: any): Promise<EtapaPractica> {
    const entity = this.orm.create({
      ...data,
      centroId: TenantFilter.getCurrentCentroId(),
    });
    const saved = await this.orm.save(entity) as unknown as EtapaPracticaOrmEntity;
    await this.cache.invalidate('etapas'); // ← invalida caché al crear
    return this.toDomain(saved);
  }

  async findAll(): Promise<EtapaPractica[]> {
    const cached = await this.cache.get<EtapaPractica[]>('etapas');
    if (cached) return cached; // ← retorna caché si existe

    // DEBUG TEMPORAL — muestra todas las prácticas sin filtro
    const allRaw = await this.orm.find({ select: ['id', 'matriculaId', 'centroId'] as any });
    console.log('[EP-DEBUG] Todas las prácticas en DB:', JSON.stringify(allRaw));

    const qb = this.orm
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.empresa', 'empresa')
      .leftJoinAndSelect('ep.modalidad', 'modalidad')
      .orderBy('ep.fecha_inicio', 'DESC');

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const result = (await qb.getMany()).map((e) => this.toDomain(e));
    await this.cache.set('etapas', result); // ← guarda en caché
    return result;
  }

  async findById(id: string): Promise<EtapaPractica | null> {
    const cached = await this.cache.get<EtapaPractica>('etapas', id);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('ep')
      .where('ep.id = :id', { id });

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('etapas', result, id);
    return result;
  }

  async findByIdWithRelations(id: string): Promise<EtapaPractica | null> {
    const cached = await this.cache.get<EtapaPractica>('etapas', `rel:${id}`);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.empresa', 'empresa')
      .leftJoinAndSelect('ep.modalidad', 'modalidad')
      .where('ep.id = :id', { id });

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('etapas', result, `rel:${id}`);
    return result;
  }

  async save(etapa: EtapaPractica): Promise<EtapaPractica> {
    const entity = this.orm.create(etapa);
    const result = this.toDomain(await this.orm.save(entity));
    await this.cache.invalidate('etapas'); // ← invalida al actualizar
    return result;
  }

  async deleteById(id: string): Promise<number> {
    const affected = (await this.orm.delete(id)).affected ?? 0;
    await this.cache.invalidate('etapas'); // ← invalida al eliminar
    return affected;
  }

  async updateObservacion(id: string, observacion: string): Promise<void> {
    await this.orm
      .createQueryBuilder()
      .update()
      .set({ observacion })
      .where('id = :id', { id })
      .execute();
    await this.cache.invalidate('etapas');
  }

  async updateAvance(id: string, avance: number): Promise<void> {
    await this.orm
      .createQueryBuilder()
      .update()
      .set({ avance })
      .where('id = :id', { id })
      .execute();
    await this.cache.invalidate('etapas');
  }

  async updateEstado(id: string, estado: string): Promise<void> {
    await this.orm
      .createQueryBuilder()
      .update()
      .set({ estado })
      .where('id = :id', { id })
      .execute();
    await this.cache.invalidate('etapas');
  }

  async findByMatriculaId(matriculaId: string): Promise<EtapaPractica | null> {
    const cached = await this.cache.get<EtapaPractica>('etapas', `matricula:${matriculaId}`);
    if (cached) return cached;

    const qb = this.orm
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.empresa', 'empresa')
      .leftJoinAndSelect('ep.modalidad', 'modalidad')
      .leftJoinAndSelect('ep.seguimientos', 'seguimientos')
      .leftJoinAndSelect('seguimientos.bitacoras', 'bitacoras')
      .where('ep.matriculaId = :matriculaId', { matriculaId });

    TenantFilter.apply(qb, 'ep');
    RlsFilter.applyEtapaPractica(qb, 'ep');

    const e = await qb.getOne();
    const result = e ? this.toDomain(e) : null;
    if (result) await this.cache.set('etapas', result, `matricula:${matriculaId}`);
    return result;
  }

  private toDomain(e: EtapaPracticaOrmEntity): EtapaPractica {
    const p = new EtapaPractica();
    p.id = e.id;
    p.matriculaId = e.matriculaId;
    p.fecha_inicio = e.fecha_inicio;
    p.fecha_fin = e.fecha_fin;
    p.estado = e.estado;
    p.observacion = e.observacion;
    p.avance = e.avance ?? 0;
    if (e.empresa) {
      p.empresa = {
        id:        e.empresa.id,
        nombre:    e.empresa.nombre,
        nit:       e.empresa.nit,
        direccion: e.empresa.direccion,
        telefono:  e.empresa.telefono,
        correo:    e.empresa.correo,
        municipio: e.empresa.municipio,
        tipo:      e.empresa.tipo,
      };
    }
    if (e.modalidad) p.modalidad = { id: e.modalidad.id, nombre: (e.modalidad as any).nombre };
    if(e.seguimientos) p['seguimientos'] = e.seguimientos.map(s => ({ id: s.id, fecha_inicio: s.fecha_inicio, fecha_fin: s.fecha_fin, observacion: s.observacion, actas_pdf: s.actas_pdf, estado: s.estado }));
      if(e.seguimientos) p['bitacoras'] = e.seguimientos.flatMap(s => s.bitacoras ? s.bitacoras.map(b => ({ id: b.id, fecha: b.fecha, estado: b.estado })) : []);
    return p;
  }
}