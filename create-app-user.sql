-- Crear usuario de aplicación (no superusuario)
CREATE USER app_epsas WITH PASSWORD 'app_epsas_2026';

-- Darle permisos sobre las tablas
GRANT CONNECT ON DATABASE epsas TO app_epsas;
GRANT USAGE ON SCHEMA public TO app_epsas;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_epsas;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_epsas;