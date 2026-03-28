import { ForbiddenException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { RequestContextService } from '../rls/request-context';

export class TenantFilter {
  static apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const centroId = RequestContextService.getCentroId();
    if (!centroId) throw new ForbiddenException('Sin centro de formación en la sesión');
    return qb.andWhere(`${alias}.centroId = :centroId`, { centroId });
  }

  static getCurrentCentroId(): string {
    const centroId = RequestContextService.getCentroId();
    if (!centroId) throw new ForbiddenException('Sin centro de formación en la sesión');
    return centroId;
  }

  // Opcional — si necesitas filtrar por sede además de centro
  static applyWithSede<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const centroId = RequestContextService.getCentroId();
    const sedeId   = RequestContextService.getSedeId();
    if (!centroId) throw new ForbiddenException('Sin centro de formación en la sesión');

    qb.andWhere(`${alias}.centroId = :centroId`, { centroId });
    if (sedeId) {
      qb.andWhere(`${alias}.sedeId = :sedeId`, { sedeId });
    }
    return qb;
  }
}