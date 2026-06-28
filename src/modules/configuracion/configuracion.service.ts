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

  /** Devuelve la configuración global. Garantiza la fila singleton sin race condition. */
  async getConfig(): Promise<{ minAvance: number }> {
    // INSERT con valor por defecto solo si id=1 no existe — nunca sobreescribe
    await this.orm
      .createQueryBuilder()
      .insert()
      .into(ConfiguracionPractica)
      .values({ id: 1, min_avance: 70 })
      .orIgnore()
      .execute();
    const config = await this.orm.findOne({ where: { id: 1 } });
    return { minAvance: Number(config!.min_avance) };
  }

  /** Actualiza el porcentaje mínimo de avance requerido. */
  async updateConfig(minAvance: number): Promise<{ minAvance: number }> {
    await this.orm.upsert({ id: 1, min_avance: minAvance }, ['id']);
    const saved = await this.orm.findOne({ where: { id: 1 } });
    return { minAvance: Number(saved!.min_avance) };
  }
}
