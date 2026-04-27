import { Entity, PrimaryColumn, Column } from 'typeorm';

/** Tabla de fila única (id = 1) con ajustes globales del sistema. */
@Entity('configuracion_practica')
export class ConfiguracionPractica {
  /** Siempre = 1 (única fila) */
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  /** Porcentaje mínimo de avance académico para poder crear una etapa práctica */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 70 })
  min_avance: number;
}
