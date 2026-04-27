import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionPractica } from './configuracion.entity';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(ConfiguracionPractica)
    private readonly repo: Repository<ConfiguracionPractica>,
  ) {}

  /** Devuelve la configuración global. Si no existe la fila, la crea con valores por defecto. */
  async getConfig(): Promise<{ minAvance: number }> {
    let config = await this.repo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.repo.create({ id: 1, min_avance: 70 });
      await this.repo.save(config);
    }
    return { minAvance: Number(config.min_avance) };
  }

  /** Actualiza el porcentaje mínimo de avance requerido. */
  async updateConfig(minAvance: number): Promise<{ minAvance: number }> {
    const exists = await this.repo.findOne({ where: { id: 1 } });
    if (exists) {
      await this.repo
        .createQueryBuilder()
        .update(ConfiguracionPractica)
        .set({ min_avance: minAvance })
        .where('id = :id', { id: 1 })
        .execute();
    } else {
      await this.repo.save({ id: 1, min_avance: minAvance });
    }
    return { minAvance };
  }
}
