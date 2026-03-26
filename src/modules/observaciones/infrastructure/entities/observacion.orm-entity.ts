import { SeguimientoOrmEntity } from 'src/modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { PrimaryGeneratedColumn, Column, ManyToOne, Entity } from 'typeorm';

@Entity()
export class ObservacionOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('date') fecha: Date;
  @Column('text') descripcion: string;
  @Column('text') evidencia_foto: string;
  @Column('text') persona: string;
  @ManyToOne(() => SeguimientoOrmEntity, (s) => s.observaciones)
  seguimiento: SeguimientoOrmEntity;
}