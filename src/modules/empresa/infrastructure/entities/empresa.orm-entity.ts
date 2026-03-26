//import { EtapaPractica } from 'src/etapa_practica/entities/etapa_practica.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('empresas')
export class EmpresaOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int', { unique: true })
  nit: string;

  @Column('text')
  nombre: string;

  @Column('text')
  direccion: string;

  @Column('text')
  telefono: string;

  @Column('text')
  correo: string;

  @Column('text')
  municipio: string;

  @Column('text', { default: 'activo' })
  estado: string;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitud: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitud: number;

  @Column('text')
  tipo: string;

  // @OneToMany(() => EtapaPractica, (etapa) => etapa.empresa)
  // etapas: EtapaPractica[];
}
