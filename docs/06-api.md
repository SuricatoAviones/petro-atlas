# API REST

La API es de solo lectura y sirve datos. Los cálculos de ingeniería corren en el navegador con `petro-calc`. Todas las rutas responden JSON salvo las teselas y la exportación.

## Rutas

| Método y ruta | Devuelve | Parámetros |
| --- | --- | --- |
| `GET /api/health` | Estado del servicio y de la base de datos | |
| `GET /api/fields` | Lista de campos con operadora y estado | `status` |
| `GET /api/fields/:id` | Campo con su polígono GeoJSON y totales | |
| `GET /api/fields/:id/production` | Serie de producción del campo | `from`, `to`, `interval` |
| `GET /api/wells` | Pozos como GeoJSON FeatureCollection | `bbox`, `field`, `status`, `type`, `operator`, `spudFrom`, `spudTo` |
| `GET /api/wells/:id` | Metadatos del pozo y series disponibles | |
| `GET /api/wells/:id/production` | Tasas, presiones, temperaturas y choke | `from`, `to`, `interval` = `day` o `month` |
| `GET /api/wells/:id/trajectory` | Estaciones de desviación | |
| `GET /api/wells/:id/logs` | Curvas de registro disponibles y sus datos | `curves`, `top`, `base` |
| `GET /api/wells/:id/export.csv` | Series del pozo en CSV | `from`, `to` |
| `GET /api/alerts` | Pozos con alertas activas, críticas primero | `field`, `level` |
| `GET /api/tiles/wells/{z}/{x}/{y}.mvt` | Teselas vectoriales de pozos | |
| `GET /api/meta/sources` | Fuentes de datos, licencias y fecha de última ingesta | |
| `GET /api/docs` | Especificación OpenAPI generada desde el código | |

## Convenciones

- Fechas en ISO 8601 (`2012-03-15`).
- Valores en SI, con la unidad declarada en la respuesta.
- `bbox` es `minLon,minLat,maxLon,maxLat` en EPSG:4326.
- Las listas se paginan por cursor: `?limit=100&cursor=...`. La respuesta trae `nextCursor` o `null`.
- Los parámetros se validan con Zod. Un parámetro inválido responde 400.
- Las respuestas de lectura llevan `Cache-Control`. Los datos solo cambian con una ingesta.

## Errores

Todos los errores usan la misma forma:

```json
{ "error": { "code": "WELL_NOT_FOUND", "message": "No existe el pozo 9999" } }
```

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `INVALID_PARAMS` | Un parámetro no pasa la validación |
| 404 | `WELL_NOT_FOUND`, `FIELD_NOT_FOUND` | El recurso no existe |
| 429 | `RATE_LIMITED` | Se superó el límite de peticiones |
| 500 | `INTERNAL` | Error no previsto; el detalle va al log, no a la respuesta |

## Ejemplos de respuesta

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
        "name": "15/9-F-12",
        "wellType": "producer",
        "status": "shut_in",
        "fieldId": 3,
        "fieldName": "VOLVE",
        "alertLevel": null,
        "hasDailyData": true
      }
    }
  ],
  "nextCursor": null
}
```

`GET /api/wells/12/production?from=2010-01-01&to=2010-01-03&interval=day`

Las series van en columnas, no en filas, para reducir el tamaño de la respuesta. Un valor ausente es `null`.

```json
{
  "wellId": 12,
  "interval": "day",
  "units": {
    "oil": "Sm3", "gas": "Sm3", "water": "Sm3",
    "bhp": "bar", "whp": "bar", "bht": "degC", "wht": "degC",
    "choke": "%", "onStream": "h"
  },
  "dates": ["2010-01-01", "2010-01-02", "2010-01-03"],
  "series": {
    "oil": [1520.4, 1498.2, 1503.9],
    "gas": [221300, 218900, 219700],
    "water": [310.5, 318.0, 322.4],
    "bhp": [241.7, 241.2, null],
    "whp": [38.6, 38.4, 38.5],
    "bht": [106.1, 106.1, null],
    "wht": [84.3, 84.1, 84.2],
    "choke": [52.0, 52.0, 52.0],
    "onStream": [24, 24, 24]
  },
  "source": { "name": "Volve", "license": "Equinor Open Data Licence" }
}
```

Los valores del ejemplo son ilustrativos.

`GET /api/alerts`

```json
{
  "asOfByWell": true,
  "items": [
    {
      "wellId": 14,
      "wellName": "15/9-F-14",
      "level": "critical",
      "kinds": ["production_drop"],
      "asOf": "2016-07-13",
      "detail": { "oil7d": 41.2, "oilPrev30": 96.8 }
    }
  ]
}
```

## Agregación de series

- `interval=day` devuelve los registros tal como están.
- `interval=month` suma volúmenes y promedia presiones, temperaturas y choke sobre los días con dato.
- Si el rango pedido supera unos 5.000 puntos, la web reduce la serie para dibujarla. La API no altera los datos diarios.

## Seguridad

- CORS limitado al origen de la web.
- Límite de peticiones por IP.
- Sin rutas de escritura. La API se conecta con un usuario de base de datos de solo lectura.
- Todo SQL es parametrizado.
