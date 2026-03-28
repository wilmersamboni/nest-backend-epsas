import { AsignacionOrmEntity } from 'src/modules/asignaciones/infrastructure/entities/asignacion.orm-entity';
import { EmpresaOrmEntity } from 'src/modules/empresa/infrastructure/entities/empresa.orm-entity';
import { ModalidadOrmEntity } from 'src/modules/modalidad/infrastructure/entities/modalidad.orm-entity';
import { SeguimientoOrmEntity } from 'src/modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class EtapaPracticaOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column('uuid')
  centroId: string; 
  
  @Column('uuid', { nullable: true })
  sedeId: string | null;

  @Column('uuid')
  matriculaId: string;

  @Column('date')
  fecha_inicio: Date;

  @Column('date')
  fecha_fin: Date;

  @Column('text')
  estado: string;

  @Column('text')
  observacion: string;

  @ManyToOne(() => EmpresaOrmEntity)
  empresa: EmpresaOrmEntity;

  @ManyToOne(() => ModalidadOrmEntity)
  modalidad: ModalidadOrmEntity;

  @OneToMany(() => AsignacionOrmEntity, (a) => a.etapa)
  asignaciones: AsignacionOrmEntity[];

  @OneToMany(() => SeguimientoOrmEntity, (s) => s.etapa)
  seguimientos: SeguimientoOrmEntity[];
}