-- Función que corre como superusuario (bypasea RLS internamente)
CREATE OR REPLACE FUNCTION check_instructor_etapa(etapa_id uuid, instructor_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- corre como postgres, no como app_epsas
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignacion_orm_entity
    WHERE "etapaId"::uuid = etapa_id
    AND instructor::uuid = instructor_id::uuid
  );
$$;

-- Reemplazar la policy del docente usando la función
DROP POLICY IF EXISTS etapa_docente ON etapa_practica_orm_entity;
CREATE POLICY etapa_docente ON etapa_practica_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND check_instructor_etapa(id, current_setting('app.current_user_id', true))
  );

-- Lo mismo para seguimiento_docente
CREATE OR REPLACE FUNCTION check_instructor_seguimiento(seguimiento_id uuid, instructor_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignacion_orm_entity a
    JOIN seguimiento_orm_entity s ON s."etapaId"::uuid = a."etapaId"::uuid
    WHERE s.id = seguimiento_id
    AND a.instructor::uuid = instructor_id::uuid
  );
$$;

DROP POLICY IF EXISTS seguimiento_docente ON seguimiento_orm_entity;
CREATE POLICY seguimiento_docente ON seguimiento_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND check_instructor_seguimiento(id, current_setting('app.current_user_id', true))
  );

-- Lo mismo para bitacora_docente
CREATE OR REPLACE FUNCTION check_instructor_bitacora(bitacora_id uuid, instructor_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignacion_orm_entity a
    JOIN seguimiento_orm_entity s ON s."etapaId"::uuid = a."etapaId"::uuid
    JOIN bitacora_orm_entity b ON b."seguimientoId"::uuid = s.id
    WHERE b.id = bitacora_id
    AND a.instructor::uuid = instructor_id::uuid
  );
$$;

DROP POLICY IF EXISTS bitacora_docente ON bitacora_orm_entity;
CREATE POLICY bitacora_docente ON bitacora_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND check_instructor_bitacora(id, current_setting('app.current_user_id', true))
  );

-- Lo mismo para observacion_docente
CREATE OR REPLACE FUNCTION check_instructor_observacion(observacion_id uuid, instructor_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignacion_orm_entity a
    JOIN seguimiento_orm_entity s ON s."etapaId"::uuid = a."etapaId"::uuid
    JOIN observacion_orm_entity o ON o."seguimientoId"::uuid = s.id
    WHERE o.id = observacion_id
    AND a.instructor::uuid = instructor_id::uuid
  );
$$;

DROP POLICY IF EXISTS observacion_docente ON observacion_orm_entity;
CREATE POLICY observacion_docente ON observacion_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND check_instructor_observacion(id, current_setting('app.current_user_id', true))
  );