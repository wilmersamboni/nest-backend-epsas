import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
} from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { RequestContextService } from '../common/rls/request-context';

@Injectable()
@EventSubscriber()
export class RlsSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(RlsSubscriber.name);
  private isSetting = false; // ← bandera anti-loop

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.dataSource.subscribers.push(this);
  }

  async beforeQuery(event: any): Promise<void> {
    if (this.isSetting) return; // ← corta el loop

    const user = RequestContextService.getUser();
    if (!user) return;

    this.isSetting = true;
    try {
      await event.connection.query(
        `SELECT 
          set_config('app.current_user_id',   $1, true),
          set_config('app.current_user_rol',  $2, true),
          set_config('app.current_centro_id', $3, true)`,
        [user.sub, user.rol, user.centroId],
      );
    } catch (e) {
      this.logger.warn('RlsSubscriber error: ' + e.message);
    } finally {
      this.isSetting = false; // ← siempre resetea
    }
  }
}