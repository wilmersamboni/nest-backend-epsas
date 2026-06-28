import { SeguimientoOrmEntity } from 'src/modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { PrimaryGeneratedColumn, Column, ManyToOne, Entity } from 'typeorm';

@Entity()
export class ObservacionOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid')
  centroId: string;
  @Column('uuid', { nullable: true })
  sedeId: string | null;
  @Column('date') fecha: Date;
  @Column('text') descripcion: string;
  @Column('text', { default: '' }) evidencia_foto: string;
  @Column('text') persona: string;
  @ManyToOne(() => SeguimientoOrmEntity, (s) => s.observaciones)
  seguimiento: SeguimientoOrmEntity;
}
