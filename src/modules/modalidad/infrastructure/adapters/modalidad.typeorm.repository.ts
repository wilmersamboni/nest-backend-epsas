import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modalidad } from '../../domain/entities/modalidad.entity';
import { IModalidadRepository } from '../../domain/ports/modalidad.repository.port';
import { ModalidadOrmEntity } from '../entities/modalidad.orm-entity';

@Injectable()
export class ModalidadTypeOrmRepository implements IModalidadRepository {
  constructor(
    @InjectRepository(ModalidadOrmEntity)
    private readonly orm: Repository<ModalidadOrmEntity>,
  ) {}

  async create(data: Partial<Modalidad>): Promise<Modalidad> {
    const entity = this.orm.create(data);
    return this.toDomain(await this.orm.save(entity));
  }

  async findAll(): Promise<Modalidad[]> {
    return (await this.orm.find()).map(this.toDomain);
  }

  async findById(id: string): Promise<Modalidad | null> {
    const e = await this.orm.findOneBy({ id });
    return e ? this.toDomain(e) : null;
  }

  async save(modalidad: Modalidad): Promise<Modalidad> {
    return this.toDomain(await this.orm.save(this.orm.create(modalidad)));
  }

  async remove(modalidad: Modalidad): Promise<void> {
    await this.orm.remove(this.orm.create(modalidad));
  }

  private toDomain(e: ModalidadOrmEntity): Modalidad {
    const m = new Modalidad();
    m.id = e.id;
    m.nombre = e.nombre;
    return m;
  }
}