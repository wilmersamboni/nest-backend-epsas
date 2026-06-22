import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfiguracionPractica } from './configuracion.entity';
import { RequestContextService } from 'src/common/rls/request-context';

@Injectable()
export class ConfiguracionService {
  constructor() {}

  private get orm(): Repository<ConfiguracionPractica> {
    return RequestContextService.getDataSource().getRepository(ConfiguracionPractica);
  }

  /** Devuelve la configuración global. Si no existe la fila, la crea con valores por defecto. */
  async getConfig(): Promise<{ minAvance: number }> {
    let config = await this.orm.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.orm.create({ id: 1, min_avance: 70 });
      await this.orm.save(config);
    }
    return { minAvance: Number(config.min_avance) };
  }

  /** Actualiza el porcentaje mínimo de avance requerido. */
  async updateConfig(minAvance: number): Promise<{ minAvance: number }> {
    const exists = await this.orm.findOne({ where: { id: 1 } });
    if (exists) {
      await this.orm
        .createQueryBuilder()
        .update(ConfiguracionPractica)
        .set({ min_avance: minAvance })
        .where('id = :id', { id: 1 })
        .execute();
    } else {
      await this.orm.save({ id: 1, min_avance: minAvance });
    }
    return { minAvance };
  }
}
