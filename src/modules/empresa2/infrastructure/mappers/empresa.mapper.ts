// import { Empresa } from '../../domain/entities/empresa.entity';
// import { EmpresaOrmEntity } from '../entities/empresa.orm-entity';

// export class EmpresaMapper {

//   static toDomain(entity: EmpresaOrmEntity): Empresa {
//     return new Empresa(
//       entity.id,
//       entity.nit,
//       entity.nombre,
//       entity.direccion,
//       entity.telefono,
//       entity.correo,
//       entity.municipio,
//       entity.estado,
//       entity.longitud,
//       entity.latitud,
//       entity.tipo,
//     );
//   }

//   static toOrm(domain: Empresa): EmpresaOrmEntity {
//     const entity = new EmpresaOrmEntity();

//     entity.id = domain.id;
//     entity.nit = domain.nit;
//     entity.nombre = domain.nombre;
//     entity.direccion = domain.direccion;
//     entity.telefono = domain.telefono;
//     entity.correo = domain.correo;
//     entity.municipio = domain.municipio;
//     entity.estado = domain.estado;
//     // entity.longitud = domain.longitud;
//     // entity.latitud = domain.latitud;
//     // entity.tipo = domain.tipo;

//     return entity;
//   }
// }