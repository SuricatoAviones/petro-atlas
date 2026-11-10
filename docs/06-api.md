# API REST

La API es de solo lectura y sirve datos. Los cálculos de ingeniería corren en el navegador con `petro-calc`. Todas las rutas responden JSON salvo las teselas y la exportación.

## Rutas

| Método y ruta | Devuelve | Parámetros |
| --- | --- | --- |
| `GET /api/health` | Estado del servicio y de la base de datos | |
| `GET /api/fields` | Lista de campos con operadora, estado y número de pozos | `status` |
| `GET /api/fields/:id` | Campo con su polígono GeoJSON y totales | |
| `GET /api/fields/:id/production` | Serie de producción del campo | `from`, `to`, `interval` |
| `GET /api/wells` | Pozos como GeoJSON FeatureCollection | `bbox`, `field`, `status`, `type`, `operator`, `spudFrom`, `spudTo` |
| `GET /api/wells/cumulative` | Acumulados por pozo para el mapa de burbujas | `bbox`, `field`, `status`, `type`, `operator`, `spudFrom`, `spudTo` |
| `GET /api/wells/:id` | Metadatos del pozo y series disponibles | |
| `GET /api/wells/:id/production` | Tasas, presiones, temperaturas y choke | `from`, `to`, `interval` = `day` o `month` |
| `GET /api/wells/:id/trajectory` | Estaciones de desviación | |
| `GET /api/wells/:id/logs` | Curvas de registro disponibles y sus datos | `curves`, `top`, `base` |
| `GET /api/wells/:id/export.csv` | Series del pozo en CSV | `from`, `to` |
| `GET /api/alerts` | Pozos con alertas activas, críticas primero | `field`, `level` |
| `GET /api/tiles/wells/{z}/{x}/{y}.mvt` | Teselas vectoriales de pozos | `field`, `status`, `type`, `operator`, `spudFrom`, `spudTo` |
| `GET /api/tiles/fields/{z}/{x}/{y}.mvt` | Teselas vectoriales de campos | |
| `GET /api/meta/sources` | Fuentes de datos, licencias y fecha de última ingesta | |
| `GET /api/docs` | Especificación OpenAPI generada desde el código | |

## Convenciones

- Fechas en ISO 8601 (`2012-03-15`).
- Valores en SI, con la unidad declarada en la respuesta.
- `bbox` es `minLon,minLat,maxLon,maxLat` en EPSG:4326.
- `:id` admite el identificador numérico o el identificador legible (`slug`) del recurso: `/api/wells/1447` y `/api/wells/15-9-F-12` devuelven lo mismo. El parámetro `field` de `/api/wells` también admite ambos.
- Los filtros `status`, `type`, `field` y `operator` admiten varios valores separados por coma. `status` y `type` solo aceptan los valores de las enumeraciones de `04-modelo-de-dominio.md`.
- `operator` filtra por la operadora del campo del pozo. Los pozos sin campo no tienen operadora.
- `spudFrom` y `spudTo` son fechas ISO e incluyen los extremos.
- Las listas se paginan por cursor: `?limit=100&cursor=...`, con `limit` entre 1 y 1000. La respuesta trae `nextCursor` o `null`. `/api/wells` trae además `totalCount`, el número de pozos que cumplen los filtros en todas las páginas.
- Los parámetros se validan con Zod. Un parámetro inválido responde 400.
- Las respuestas de lectura llevan `Cache-Control: public, max-age=300`. Los datos solo cambian con una ingesta.
- Las propiedades numéricas con unidad la llevan en el nombre: `totalDepthM`, `oilSm3`, `lonDeg`.

## Errores

Todos los errores usan la misma forma:

```json
{ "error": { "code": "WELL_NOT_FOUND", "message": "No existe el pozo 9999" } }
```

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `INVALID_PARAMS` | Un parámetro no pasa la validación |
| 404 | `WELL_NOT_FOUND`, `FIELD_NOT_FOUND` | El recurso no existe |
| 404 | `ROUTE_NOT_FOUND` | La ruta no existe |
| 429 | `RATE_LIMITED` | Se superó el límite de peticiones |
| 500 | `INTERNAL` | Error no previsto; el detalle va al log, no a la respuesta |
| 503 | `DATABASE_UNAVAILABLE` | La base de datos no responde; lo devuelve `GET /api/health` |

## Ejemplos de respuesta

`GET /api/health`

Responde 200 cuando la API puede consultar la base de datos con su usuario de solo lectura. No lleva caché (`Cache-Control: no-store`).

```json
{ "status": "ok", "database": "ok" }
```

Si la base de datos no responde, devuelve 503 con el formato común de error:

```json
{ "error": { "code": "DATABASE_UNAVAILABLE", "message": "La base de datos no responde" } }
```

`GET /api/wells?bbox=1.8,58.4,2.0,58.5`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 12,
      "geometry": { "type": "Point", "coordinates": [1.8876, 58.4415] },
      "properties": {
        "name": "VE-01",
        "slug": "15-9-F-12",
        "wellType": "producer",
        "status": "shut_in",
        "fieldId": 3,
        "fieldName": "CAMPO ESCUELA VENEZUELA",
        "alertLevel": null,
        "hasDailyData": true
      }
    }
  ],
  "totalCount": 1,
  "nextCursor": null
}
```

`alertLevel` es siempre `null` hasta que exista la vista de alertas (fase 2).

`GET /api/wells/cumulative?field=campo-escuela-venezuela`

Devuelve una fila por pozo con los volúmenes acumulados de toda su serie diaria. Un fluido sin datos es `null`, no cero.

```json
{
  "items": [
    {
      "wellId": 1447,
      "name": "VE-01",
      "lonDeg": 1.8859,
      "latDeg": 58.441,
      "oilSm3": 10037078,
      "gasSm3": 1475370112,
      "waterSm3": 15318578
    }
  ]
}
```

`GET /api/wells/15-9-F-12`

`series` dice qué datos existen para el pozo, para que la interfaz deshabilite lo que falta. `daily` es `null` si el pozo no tiene producción diaria.

```json
{
  "id": 12,
  "slug": "15-9-F-12",
  "name": "VE-01",
  "wellType": "producer",
  "status": "shut_in",
  "spudDate": "2007-06-14",
  "totalDepthM": 3520,
  "location": { "lonDeg": 1.8859, "latDeg": 58.441 },
  "field": { "id": 3, "slug": "campo-escuela-venezuela", "name": "CAMPO ESCUELA VENEZUELA", "operator": "Equinor Energy AS" },
  "series": {
    "daily": { "from": "2008-02-12", "to": "2016-09-17", "days": 3056 },
    "hasTrajectory": true,
    "logCurves": ["GR", "RHOB"]
  },
  "source": { "name": "PetroAtlas Venezuela synthetic seed", "license": "…", "url": "db/seed/generate.ts" }
}
```

`GET /api/fields`

```json
{
  "items": [
    {
      "id": 3,
      "slug": "campo-escuela-venezuela",
      "name": "CAMPO ESCUELA VENEZUELA",
      "operator": "Equinor Energy AS",
      "status": "shut_down",
      "wellCount": 25
    }
  ],
  "nextCursor": null
}
```

`GET /api/fields/campo-escuela-venezuela` devuelve lo mismo para un campo y añade `geometry` (MultiPolygon GeoJSON o `null`), `totals` (`oilSm3`, `gasSm3`, `waterSm3` acumulados de la serie mensual del campo, `null` si no hay serie cargada) y `source`.

`GET /api/meta/sources`

```json
{
  "items": [
    {
      "id": 2,
      "name": "PetroAtlas Venezuela synthetic seed",
      "license": "…",
      "url": "db/seed/generate.ts",
      "ingestedAt": "2026-11-10T00:53:45.658Z"
    }
  ]
}
```

`GET /api/wells/12/production?from=2010-01-01&to=2010-01-03&interval=day`

Las series van en columnas, no en filas, para reducir el tamaño de la respuesta. Un valor ausente es `null`.

```json
{
  "wellId": 12,
  "interval": "day",
  "units": {
    "oil": "Sm3", "gas": "Sm3", "water": "Sm3", "waterInj": "Sm3",
    "bhp": "bar", "whp": "bar", "bht": "degC", "wht": "degC",
    "choke": "%", "onStream": "h"
  },
  "dates": ["2010-01-01", "2010-01-02", "2010-01-03"],
  "series": {
    "oil": [1520.4, 1498.2, 1503.9],
    "gas": [221300, 218900, 219700],
    "water": [310.5, 318.0, 322.4],
    "waterInj": [null, null, null],
    "bhp": [241.7, 241.2, null],
    "whp": [38.6, 38.4, 38.5],
    "bht": [106.1, 106.1, null],
    "wht": [84.3, 84.1, 84.2],
    "choke": [52.0, 52.0, 52.0],
    "onStream": [24, 24, 24]
  },
  "source": { "name": "PetroAtlas Venezuela synthetic seed", "license": "MIT. Datos sintéticos; no son mediciones reales." }
}
```

Los valores del ejemplo son ilustrativos. `interval=month` suma los volúmenes y promedia presiones, temperaturas, choke y horas en línea sobre los días con dato.

`GET /api/wells/12/trajectory`

```json
{
  "wellId": 12,
  "stations": [
    { "mdM": 0, "tvdM": 0, "inclDeg": 0, "azimDeg": 0 },
    { "mdM": 100, "tvdM": 95.2, "inclDeg": 10.4, "azimDeg": 42.0 }
  ],
  "source": { "name": "PetroAtlas Venezuela synthetic seed", "license": "MIT. Datos sintéticos; no son mediciones reales." }
}
```

`GET /api/fields/3/production?from=2010-01-01&to=2010-03-31`

La serie del campo es siempre mensual.

```json
{
  "fieldId": 3,
  "interval": "month",
  "units": { "oil": "Sm3", "gas": "Sm3", "water": "Sm3" },
  "dates": ["2010-01-01", "2010-02-01", "2010-03-01"],
  "series": {
    "oil": [42000, 40500, 39800],
    "gas": [6100000, 5900000, 5800000],
    "water": [2100, 2400, 2800]
  },
  "source": { "name": "PetroAtlas Venezuela synthetic seed", "license": "MIT. Datos sintéticos; no son mediciones reales." }
}
```

Los valores de los ejemplos de trayectoria y campo son ilustrativos.

`GET /api/alerts`

```json
{
  "asOfByWell": true,
  "items": [
    {
      "wellId": 14,
      "wellSlug": "15-9-F-14",
      "wellName": "15/9-F-14",
      "level": "critical",
      "kinds": ["production_drop"],
      "asOf": "2016-07-13",
      "detail": {
        "oil7d": 41.2,
        "oilPrev30": 96.8,
        "waterCut7d": 0.42,
        "prod3d": 123.4
      }
    }
  ]
}
```

## Teselas de pozos

`GET /api/tiles/wells/{z}/{x}/{y}.mvt` responde `application/vnd.mapbox-vector-tile`, generado con `ST_AsMVT`. Una tesela sin pozos responde 204 sin cuerpo.

| Capa | Cuándo | Contenido |
| --- | --- | --- |
| `clusters` | Hasta el zoom 8 | Un punto por grupo de pozos, con `pointCount` |
| `wells` | Siempre | Un punto por pozo, con `name`, `slug`, `wellType` y `status`; el identificador de la entidad es el del pozo |

- Hasta el zoom 8, la tesela se divide en una cuadrícula de 8 × 8 celdas. Los pozos de una misma celda se sirven como un grupo en su centroide; una celda con un solo pozo lo sirve en la capa `wells`.
- A partir del zoom 9 cada pozo es una entidad. Varios pozos pueden compartir coordenadas, porque salen de la misma plataforma: la interfaz debe listar todos los que haya bajo el clic.
- Admite los mismos filtros de atributos que `GET /api/wells`, de modo que los conteos de los grupos coinciden con la lista filtrada. Cada combinación de filtros es una URL distinta y se cachea por separado.
- `z` va de 0 a 22; `x` e `y` deben existir en ese zoom. Si no, responde 400.

## Teselas de campos

`GET /api/tiles/fields/{z}/{x}/{y}.mvt` responde `application/vnd.mapbox-vector-tile`, generado con `ST_AsMVT`. Una tesela sin campos responde 204 sin cuerpo.

| Capa | Contenido |
| --- | --- |
| `fields` | Un polígono por campo, con `name`, `slug` y `status`; el identificador de la entidad es el del campo |

- Los polígonos se recortan a la tesela. En zooms bajos solo aparecen los campos lo bastante grandes para dibujarse a esa escala.
- `z` va de 0 a 22; `x` e `y` deben existir en ese zoom. Si no, responde 400.

## Agregación de series

- `interval=day` devuelve los registros tal como están.
- `interval=month` suma volúmenes y promedia presiones, temperaturas y choke sobre los días con dato.
- Si el rango pedido supera unos 5.000 puntos, la web reduce la serie para dibujarla. La API no altera los datos diarios.

## Seguridad

- CORS limitado al origen de la web.
- Cabeceras de seguridad con Helmet.
- Las respuestas de más de 1 kB se comprimen si el cliente lo acepta, incluidas las teselas.
- Límite de peticiones por IP: 1.200 por minuto por defecto (`RATE_LIMIT_PER_MINUTE`), holgado porque cada vista del mapa pide varias teselas.
- Sin rutas de escritura. La API se conecta con un usuario de base de datos de solo lectura.
- Todo SQL es parametrizado.
