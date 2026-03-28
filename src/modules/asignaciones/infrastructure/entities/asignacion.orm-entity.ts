import { EtapaPracticaOrmEntity } from 'src/modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity()
export class AsignacionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column('uuid')
  centroId: string; 
  @Column('uuid', { nullable: true })
  sedeId: string | null;

  @Column('text')
  instructor: string;

  @Column('date')
  fecha_inicio: Date;

  @Column('date')
  fecha_fin: Date;

  @Column('text', { default: 'activo' })
  estado: string;

  @Column('int')
  horas: number;

  @ManyToOne(() => EtapaPracticaOrmEntity)
  etapa: EtapaPracticaOrmEntity;
}