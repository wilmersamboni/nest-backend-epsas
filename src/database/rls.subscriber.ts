import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from '../common/rls/request-context';

@Injectable()
export class RlsSubscriber {
  private readonly logger = new Logger(RlsSubscriber.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.hookConnectionPool();
  }

  private hookConnectionPool() {
  const driver = this.dataSource.driver as any;
  const pool = driver.master;

  if (!pool) {
    this.logger.warn('No se encontró el pool de conexiones');
    return;
  }

  // 'acquire' dispara cada vez que se saca una conexión del pool
  pool.on('acquire', async (client: any) => {
    const user = RequestContextService.getUser();
    if (!user) return;

    try {
      await client.query(
        `SELECT 
          set_config('app.current_user_id',   $1, false),
          set_config('app.current_user_rol',  $2, false),
          set_config('app.current_centro_id', $3, false)`,
        [user.sub, user.rol, user.centroId],
      );
      this.logger.log(`RLS seteado para rol: ${user.rol}`);
    } catch (e) {
      this.logger.warn('RLS acquire hook error: ' + e.message);
    }
  });

  this.logger.log('RLS pool hook registrado en acquire');
}
}