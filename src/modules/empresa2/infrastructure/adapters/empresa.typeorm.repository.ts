// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { EmpresaOrmEntity } from '../entities/empresa.orm-entity';
// import { EmpresaRepositoryPort } from '../../domain/ports/empresa.repository.port';
// import { Empresa } from '../../domain/entities/empresa.entity';
// import { EmpresaMapper } from '../mappers/empresa.mapper';

// @Injectable()
// export class EmpresaTypeOrmRepository implements EmpresaRepositoryPort {

//   constructor(
//     @InjectRepository(EmpresaOrmEntity)
//     private readonly repo: Repository<EmpresaOrmEntity>,
//   ) {}

//   create(data: Partial<Empresa>): Empresa {
//     return data as Empresa;
//   }

//   async save(empresa: Empresa): Promise<Empresa> {
//     const orm = EmpresaMapper.toOrm(empresa);
//     const saved = await this.repo.save(orm);
//     return EmpresaMapper.toDomain(saved);
//   }

//   async findAll(): Promise<Empresa[]> {
//     const entities = await this.repo.find();
//     return entities.map(EmpresaMapper.toDomain);
//   }

//   async findById(id: string): Promise<Empresa | null> {
//     const entity = await this.repo.findOneBy({ id });
//     return entity ? EmpresaMapper.toDomain(entity) : null;
//   }

//   async remove(empresa: Empresa): Promise<void> {
//     const orm = EmpresaMapper.toOrm(empresa);
//     await this.repo.remove(orm);
//   }
// }