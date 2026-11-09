#!/usr/bin/env bash
# Creates the database roles from docs/05 ("Usuarios de base de datos").
#
#   petroatlas_etl  read and write: migrations, seed and ETL
#   petroatlas_api  SELECT only: the API
#
# The PostGIS image runs this once, when it initializes an empty data directory, after its own
# 10_postgis.sh. Passwords come from the environment, never from the repository.
psql --variable=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=database="$POSTGRES_DB" \
  --set=etl_password="${PETROATLAS_ETL_PASSWORD:?PETROATLAS_ETL_PASSWORD is required}" \
  --set=api_password="${PETROATLAS_API_PASSWORD:?PETROATLAS_API_PASSWORD is required}" <<'SQL'
CREATE ROLE petroatlas_etl LOGIN PASSWORD :'etl_password';
CREATE ROLE petroatlas_api LOGIN PASSWORD :'api_password';

-- Only a superuser can install PostGIS. With the extension in place, the
-- CREATE EXTENSION IF NOT EXISTS in 0001_init.sql is a no-op for petroatlas_etl.
CREATE EXTENSION IF NOT EXISTS postgis;

REVOKE ALL ON DATABASE :"database" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"database" TO petroatlas_etl;
GRANT CONNECT ON DATABASE :"database" TO petroatlas_api;
GRANT USAGE, CREATE ON SCHEMA public TO petroatlas_etl;
GRANT USAGE ON SCHEMA public TO petroatlas_api;

-- Every table petroatlas_etl creates is readable, and only readable, by the API.
ALTER DEFAULT PRIVILEGES FOR ROLE petroatlas_etl IN SCHEMA public
  GRANT SELECT ON TABLES TO petroatlas_api;
SQL
