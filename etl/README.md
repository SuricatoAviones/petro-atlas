# etl

Descarga, normalización y carga de los datos públicos en PostgreSQL. Junto con las migraciones y el seed, es lo único que escribe en la base de datos (`docs/03-arquitectura.md`).

```bash
pnpm etl:sodir                                         # descarga, valida, normaliza y carga
pnpm --filter @petroatlas/etl sodir --skip-download    # reutiliza los archivos de data/sodir
pnpm etl:all                                           # todas las fuentes, en orden
```

Necesita `ETL_DATABASE_URL` (usuario `petroatlas_etl`) y las migraciones aplicadas.

- Los archivos descargados quedan en `data/sodir/`, que Git ignora, junto con `report.json`: filas leídas, cargadas y descartadas por motivo.
- Cada fuente se carga en una transacción y con `ON CONFLICT`: repetir la carga deja la base de datos igual.
- Las columnas, las traducciones de estado y tipo y las decisiones de carga están en `docs/10-fuentes-de-datos.md`.
- Las pruebas usan filas escritas a mano con nombres ficticios; no dependen de la red.

Volve (producción diaria) se añade en la fase 2.
