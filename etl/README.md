# etl

Descarga, normalización y carga de los datos públicos en PostgreSQL. Junto con las migraciones y el seed, es lo único que escribe en la base de datos (`docs/03-arquitectura.md`).

```bash
pnpm etl:sodir                                         # descarga, valida, normaliza y carga
pnpm --filter @petroatlas/etl sodir --skip-download    # reutiliza los archivos de data/sodir
pnpm etl:volve                                         # producción diaria, campo y trayectorias
pnpm etl:all                                           # todas las fuentes, en orden
```

Necesita `ETL_DATABASE_URL` (usuario `petroatlas_etl`) y las migraciones aplicadas. El ETL de Volve necesita además que Sodir esté cargado, porque cruza los nombres de pozo.

- Los archivos descargados quedan en `data/sodir/`, que Git ignora, junto con `report.json`: filas leídas, cargadas y descartadas por motivo.
- Equinor distribuye Volve por Databricks Marketplace. Descarga el libro `Volve production data.xlsx` y los XML de trayectorias, y colócalos en `data/volve/` y `data/volve/trajectories/`. Si tienes una URL directa al libro, exporta `VOLVE_PRODUCTION_URL` y el ETL lo descargará.
- Cada fuente se carga en una transacción y con `ON CONFLICT`: repetir la carga deja la base de datos igual.
- Las columnas, las traducciones de estado y tipo y las decisiones de carga están en `docs/10-fuentes-de-datos.md`.
- Las pruebas usan filas escritas a mano con nombres ficticios; no dependen de la red.
