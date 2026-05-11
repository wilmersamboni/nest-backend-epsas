// infrastructure/entities/documento.orm-entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { EtapaPracticaOrmEntity } from 'src/modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';

@Entity('documento')
export class DocumentoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  etapaId: string;

  @Column('text')
  nombre_original: string;

  @Column('text')
  nombre_archivo: string;

  @Column('text')
  ruta: string;

  @Column('text')
  tipo_mime: string;

  @Column('int')
  tamanio: number;

  @CreateDateColumn()
  creado_en: Date;

  @ManyToOne(() => EtapaPracticaOrmEntity, (ep) => ep.documentos, { onDelete: 'CASCADE' })
  etapa: EtapaPracticaOrmEntity;
}