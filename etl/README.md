# etl

Descarga, normalización y carga de los datos públicos (Sodir y Volve) en PostgreSQL.

Este workspace está vacío a propósito: el ETL se implementa en la fase 1, según `docs/10-fuentes-de-datos.md` y `docs/11-plan-de-fases.md`. Los archivos descargados irán a `data/`, que Git ignora.

Para desarrollo sin descargar nada, usa los datos sintéticos de `db/seed` (`pnpm db:seed`).
