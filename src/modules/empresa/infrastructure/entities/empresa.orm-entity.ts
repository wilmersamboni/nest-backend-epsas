import { EtapaPracticaOrmEntity as EtapaPractica } from 'src/modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('empresas')
export class EmpresaOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column('uuid')
  centroId: string; 
  
  @Column('uuid', { nullable: true })
  sedeId: string | null;

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

  @OneToMany(() => EtapaPractica, (etapa) => etapa.empresa)
  etapas: EtapaPractica[];
}
