import { ForbiddenException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { RequestContextService } from '../rls/request-context';

export class RlsFilter {

  static applyEtapaPractica<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const user = RequestContextService.getUser();
    if (!user) throw new ForbiddenException('Sin sesión activa');
    if (user.rol === 'admin') return qb;

    if (user.rol === 'estudiante') {
      const ids = user.matriculaIds ?? [];
      if (ids.length === 0) return qb.andWhere('1 = 0'); // sin matrículas → sin resultados
      return qb.andWhere(`${alias}.matriculaId IN (:...matriculaIds)`, { matriculaIds: ids });
    }

    if (user.rol === 'docente') {
      return qb
        .innerJoin(`${alias}.asignaciones`, 'rls_asig')
        .andWhere('rls_asig.instructor = :rlsUserId', { rlsUserId: user.sub });
    }

    throw new ForbiddenException(`Rol '${user.rol}' sin acceso a etapas`);
  }

  static applySeguimiento<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const user = RequestContextService.getUser();
    if (!user) throw new ForbiddenException('Sin sesión activa');
    if (user.rol === 'admin') return qb;

    if (user.rol === 'estudiante') {
      const ids = user.matriculaIds ?? [];
      if (ids.length === 0) return qb.andWhere('1 = 0');
      return qb
        .innerJoin(`${alias}.etapa`, 'rls_etapa')
        .andWhere('rls_etapa.matriculaId IN (:...matriculaIds)', { matriculaIds: ids });
    }

    if (user.rol === 'docente') {
      return qb
        .innerJoin(`${alias}.etapa`, 'rls_etapa')
        .innerJoin('rls_etapa.asignaciones', 'rls_asig')
        .andWhere('rls_asig.instructor = :rlsUserId', { rlsUserId: user.sub });
    }

    throw new ForbiddenException(`Rol '${user.rol}' sin acceso a seguimientos`);
  }

  static applyBitacora<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const user = RequestContextService.getUser();
    if (!user) throw new ForbiddenException('Sin sesión activa');
    if (user.rol === 'admin') return qb;

    if (user.rol === 'estudiante') {
      const ids = user.matriculaIds ?? [];
      if (ids.length === 0) return qb.andWhere('1 = 0');
      return qb
        .innerJoin(`${alias}.seguimiento`, 'rls_seg')
        .innerJoin('rls_seg.etapa', 'rls_etapa')
        .andWhere('rls_etapa.matriculaId IN (:...matriculaIds)', { matriculaIds: ids });
    }

    if (user.rol === 'docente') {
      return qb
        .innerJoin(`${alias}.seguimiento`, 'rls_seg')
        .innerJoin('rls_seg.etapa', 'rls_etapa')
        .innerJoin('rls_etapa.asignaciones', 'rls_asig')
        .andWhere('rls_asig.instructor = :rlsUserId', { rlsUserId: user.sub });
    }

    throw new ForbiddenException(`Rol '${user.rol}' sin acceso a bitácoras`);
  }

  static applyObservacion<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const user = RequestContextService.getUser();
    if (!user) throw new ForbiddenException('Sin sesión activa');
    if (user.rol === 'admin') return qb;

    if (user.rol === 'estudiante') {
      const ids = user.matriculaIds ?? [];
      if (ids.length === 0) return qb.andWhere('1 = 0');
      return qb
        .innerJoin(`${alias}.seguimiento`, 'rls_seg')
        .innerJoin('rls_seg.etapa', 'rls_etapa')
        .andWhere('rls_etapa.matriculaId IN (:...matriculaIds)', { matriculaIds: ids });
    }

    if (user.rol === 'docente') {
      return qb
        .innerJoin(`${alias}.seguimiento`, 'rls_seg')
        .innerJoin('rls_seg.etapa', 'rls_etapa')
        .innerJoin('rls_etapa.asignaciones', 'rls_asig')
        .andWhere('rls_asig.instructor = :rlsUserId', { rlsUserId: user.sub });
    }

    throw new ForbiddenException(`Rol '${user.rol}' sin acceso a observaciones`);
  }

  static applyAsignacion<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    const user = RequestContextService.getUser();
    if (!user) throw new ForbiddenException('Sin sesión activa');
    if (user.rol === 'admin') return qb;

    if (user.rol === 'docente') {
      return qb.andWhere(`${alias}.instructor = :rlsUserId`, {
        rlsUserId: user.sub,
      });
    }

    if (user.rol === 'estudiante') {
      const ids = user.matriculaIds ?? [];
      if (ids.length === 0) return qb.andWhere('1 = 0');
      return qb
        .innerJoin(`${alias}.etapa`, 'rls_etapa')
        .andWhere('rls_etapa.matriculaId IN (:...matriculaIds)', { matriculaIds: ids });
    }

    throw new ForbiddenException(`Rol '${user.rol}' sin acceso a asignaciones`);
  }
}