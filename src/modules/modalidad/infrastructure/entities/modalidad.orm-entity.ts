import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EtapaPracticaOrmEntity } from 'src/modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';

@Entity('modalidades')
export class ModalidadOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  nombre: string;

 @OneToMany(() => EtapaPracticaOrmEntity, (etapa) => etapa.modalidad)
modalidades: EtapaPracticaOrmEntity[];
}