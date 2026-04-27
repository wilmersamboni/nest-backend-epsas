import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EtapaPracticaOrmEntity } from 'src/modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';

@Entity('formato')
export class FormatoOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── RLS ──────────────────────────────────────────────────────────
  @Column('uuid')
  centroId: string;

  @Column('uuid', { nullable: true })
  sedeId: string | null;

  // ── Clasificación ─────────────────────────────────────────────────
  @Column('text')
  tipo: string;
  // Valores: 'contrato' | 'acta_inicio' | 'acta_seguimiento_1'
  //          | 'acta_seguimiento_2' | 'carta_presentacion'
  //          | 'paz_y_salvo' | 'certificado' | 'otro'

  @Column('text')
  nombre: string;

  // ── Archivo ───────────────────────────────────────────────────────
  @Column('text')
  ruta_archivo: string;       // nombre único generado en disco

  @Column('text')
  nombre_original: string;    // nombre original del fichero (para mostrar en UI)

  @Column('text', { default: 'application/pdf' })
  mime_type: string;

  @Column('bigint', { nullable: true })
  tamanio: number | null;     // tamaño en bytes

  // ── Estado y trazabilidad ─────────────────────────────────────────
  @Column('text', { default: 'activo' })
  estado: string;

  @Column('uuid', { nullable: true })
  subido_por: string | null;  // sub del JWT del usuario que subió el archivo

  @CreateDateColumn()
  created_at: Date;

  // ── Relación con etapa práctica ───────────────────────────────────
  // nullable: true → formatos globales (plantillas) no requieren etapa
  @ManyToOne(() => EtapaPracticaOrmEntity, { onDelete: 'CASCADE', eager: false, nullable: true })
  etapa: EtapaPracticaOrmEntity | null;
}
