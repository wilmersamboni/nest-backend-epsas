DROP FUNCTION IF EXISTS check_instructor_etapa(uuid, text);

CREATE OR REPLACE FUNCTION check_instructor_etapa(etapa_id uuid, instructor_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM asignacion_orm_entity
    WHERE "etapaId"::uuid = etapa_id
    AND instructor::uuid = instructor_id::uuid
  );
$$;

DROP POLICY IF EXISTS etapa_docente ON etapa_practica_orm_entity;
CREATE POLICY etapa_docente ON etapa_practica_orm_entity
  AS PERMISSIVE FOR ALL
  USING (
    current_setting('app.current_user_rol', true) = 'docente'
    AND check_instructor_etapa(id, current_setting('app.current_user_id', true))
  );