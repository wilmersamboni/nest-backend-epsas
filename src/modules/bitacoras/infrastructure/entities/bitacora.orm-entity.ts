import { SeguimientoOrmEntity } from 'src/modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class BitacoraOrmEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('date') fecha: Date;
  @Column('text') bitacora_pdf: string;
  @Column('text', { default: 'pendiente' }) estado: string;
  @ManyToOne(() => SeguimientoOrmEntity, (s) => s.bitacoras)
  seguimiento: SeguimientoOrmEntity;
}