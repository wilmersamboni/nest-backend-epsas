-- TENANT ISOLATION — va antes de todas las demás policies
-- RESTRICTIVE = AND obligatorio, no importa si otra policy es permissive

DROP POLICY IF EXISTS etapa_tenant      ON etapa_practica_orm_entity;
DROP POLICY IF EXISTS seguimiento_tenant ON seguimiento_orm_entity;
DROP POLICY IF EXISTS bitacora_tenant   ON bitacora_orm_entity;
DROP POLICY IF EXISTS observacion_tenant ON observacion_orm_entity;
DROP POLICY IF EXISTS asignacion_tenant ON asignacion_orm_entity;

CREATE POLICY etapa_tenant ON etapa_practica_orm_entity
  AS RESTRICTIVE FOR ALL
  USING ("centroId"::uuid = current_setting('app.current_centro_id', true)::uuid);

CREATE POLICY seguimiento_tenant ON seguimiento_orm_entity
  AS RESTRICTIVE FOR ALL
  USING ("centroId"::uuid = current_setting('app.current_centro_id', true)::uuid);

CREATE POLICY bitacora_tenant ON bitacora_orm_entity
  AS RESTRICTIVE FOR ALL
  USING ("centroId"::uuid = current_setting('app.current_centro_id', true)::uuid);

CREATE POLICY observacion_tenant ON observacion_orm_entity
  AS RESTRICTIVE FOR ALL
  USING ("centroId"::uuid = current_setting('app.current_centro_id', true)::uuid);

CREATE POLICY asignacion_tenant ON asignacion_orm_entity
  AS RESTRICTIVE FOR ALL
  USING ("centroId"::uuid = current_setting('app.current_centro_id', true)::uuid);


-- =============================================================
-- RLS NATIVO EN POSTGRESQL — Versión Corregida (Casting UUID)
-- =============================================================

-- 1 & 2. Habilitar y Forzar RLS (Ya lo hizo tu ejecución anterior, pero no sobra)
ALTER TABLE etapa_practica_orm_entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_orm_entity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_orm_entity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE observacion_orm_entity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignacion_orm_entity     ENABLE ROW LEVEL SECURITY;

ALTER TABLE etapa_practica_orm_entity FORCE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_orm_entity    FORCE ROW LEVEL SECURITY;
ALTER TABLE bitacora_orm_entity       FORCE ROW LEVEL SECURITY;
ALTER TABLE observacion_orm_entity    FORCE ROW LEVEL SECURITY;
ALTER TABLE asignacion_orm_entity     FORCE ROW LEVEL SECURITY;

-- =============================================================
-- POLICIES: etapa_practica_orm_entity
-- =============================================================

DROP POLICY IF EXISTS etapa_admin ON etapa_practica_orm_entity;
CREATE POLICY etapa_admin ON etapa_practica_orm_entity
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.current_user_rol', true) = 'admin');

DROP POLICY IF EXISTS etapa_estudiante ON etapa_practica_orm_entity;
CREATE POLICY etapa_estudiante ON etapa_practica_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'estudiante'
    AND "matriculaId" = current_setting('app.current_user_id', true)::uuid
  );

DROP POLICY IF EXISTS etapa_docente ON etapa_practica_orm_entity;
CREATE POLICY etapa_docente ON etapa_practica_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND id IN (
      SELECT a."etapaId"::uuid -- Cast aquí
      FROM asignacion_orm_entity a
      WHERE a.instructor::uuid = current_setting('app.current_user_id', true)::uuid -- Cast en ambos lados
    )
  );

-- =============================================================
-- POLICIES: seguimiento_orm_entity
-- =============================================================

DROP POLICY IF EXISTS seguimiento_admin ON seguimiento_orm_entity;
CREATE POLICY seguimiento_admin ON seguimiento_orm_entity
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.current_user_rol', true) = 'admin');

DROP POLICY IF EXISTS seguimiento_estudiante ON seguimiento_orm_entity;
CREATE POLICY seguimiento_estudiante ON seguimiento_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'estudiante'
    AND "etapaId" IN (
      SELECT id FROM etapa_practica_orm_entity
      WHERE "matriculaId" = current_setting('app.current_user_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS seguimiento_docente ON seguimiento_orm_entity;
CREATE POLICY seguimiento_docente ON seguimiento_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND "etapaId"::uuid IN ( -- Cast aquí
      SELECT a."etapaId"::uuid 
      FROM asignacion_orm_entity a
      WHERE a.instructor::uuid = current_setting('app.current_user_id', true)::uuid
    )
  );

-- =============================================================
-- POLICIES: bitacora_orm_entity
-- =============================================================

DROP POLICY IF EXISTS bitacora_admin ON bitacora_orm_entity;
CREATE POLICY bitacora_admin ON bitacora_orm_entity
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.current_user_rol', true) = 'admin');

DROP POLICY IF EXISTS bitacora_estudiante ON bitacora_orm_entity;
CREATE POLICY bitacora_estudiante ON bitacora_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'estudiante'
    AND "seguimientoId" IN (
      SELECT s.id FROM seguimiento_orm_entity s
      JOIN etapa_practica_orm_entity e ON e.id = s."etapaId"
      WHERE e."matriculaId" = current_setting('app.current_user_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS bitacora_docente ON bitacora_orm_entity;
CREATE POLICY bitacora_docente ON bitacora_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND "seguimientoId"::uuid IN (
      SELECT s.id::uuid 
      FROM seguimiento_orm_entity s
      JOIN asignacion_orm_entity a ON a."etapaId"::uuid = s."etapaId"::uuid
      WHERE a.instructor::uuid = current_setting('app.current_user_id', true)::uuid
    )
  );

-- =============================================================
-- POLICIES: observacion_orm_entity
-- =============================================================

DROP POLICY IF EXISTS observacion_admin ON observacion_orm_entity;
CREATE POLICY observacion_admin ON observacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.current_user_rol', true) = 'admin');

DROP POLICY IF EXISTS observacion_estudiante ON observacion_orm_entity;
CREATE POLICY observacion_estudiante ON observacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'estudiante'
    AND "seguimientoId" IN (
      SELECT s.id FROM seguimiento_orm_entity s
      JOIN etapa_practica_orm_entity e ON e.id = s."etapaId"
      WHERE e."matriculaId" = current_setting('app.current_user_id', true)::uuid
    )
  );

DROP POLICY IF EXISTS observacion_docente ON observacion_orm_entity;
CREATE POLICY observacion_docente ON observacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND "seguimientoId"::uuid IN (
      SELECT s.id::uuid 
      FROM seguimiento_orm_entity s
      JOIN asignacion_orm_entity a ON a."etapaId"::uuid = s."etapaId"::uuid
      WHERE a.instructor::uuid = current_setting('app.current_user_id', true)::uuid
    )
  );

-- =============================================================
-- POLICIES: asignacion_orm_entity
-- =============================================================

DROP POLICY IF EXISTS asignacion_admin ON asignacion_orm_entity;
CREATE POLICY asignacion_admin ON asignacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (current_setting('app.current_user_rol', true) = 'admin');

DROP POLICY IF EXISTS asignacion_docente ON asignacion_orm_entity;
CREATE POLICY asignacion_docente ON asignacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND instructor::uuid = current_setting('app.current_user_id', true)::uuid
  );

DROP POLICY IF EXISTS asignacion_estudiante ON asignacion_orm_entity;
CREATE POLICY asignacion_estudiante ON asignacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'estudiante'
    AND "etapaId" IN (
      SELECT id FROM etapa_practica_orm_entity
      WHERE "matriculaId" = current_setting('app.current_user_id', true)::uuid
    )
  );