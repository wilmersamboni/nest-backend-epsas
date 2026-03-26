import { AsignacionOrmEntity } from 'src/modules/asignaciones/infrastructure/entities/asignacion.orm-entity';
import { BitacoraOrmEntity } from 'src/modules/bitacoras/infrastructure/entities/bitacora.orm-entity';
import { EtapaPracticaOrmEntity } from 'src/modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';
import { ObservacionOrmEntity } from 'src/modules/observaciones/infrastructure/entities/observacion.orm-entity';
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SeguimientoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  actas_pdf: string;

  @Column('text')
  estado: string;

  @Column('text')
  observacion: string;

  @Column('date')
  fecha_inicio: Date;

  @Column('date')
  fecha_fin: Date;

  @ManyToOne(() => EtapaPracticaOrmEntity)
  etapa: EtapaPracticaOrmEntity;

  @ManyToOne(() => AsignacionOrmEntity)
  asignacion: AsignacionOrmEntity;

  @OneToMany(() => BitacoraOrmEntity, (b) => b.seguimiento)
  bitacoras: BitacoraOrmEntity[];

  @OneToMany(() => ObservacionOrmEntity, (o) => o.seguimiento)
  observaciones: ObservacionOrmEntity[];
}