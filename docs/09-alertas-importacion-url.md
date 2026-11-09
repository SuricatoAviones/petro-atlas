# Alertas, importación CSV y estado en la URL

Las alertas señalan en el mapa los pozos que requieren atención, la importación CSV permite analizar pozos propios y el estado en la URL hace que cualquier vista se pueda compartir.

## Alertas (RF-13)

| Alerta | Condición | Nivel |
| --- | --- | --- |
| Caída de producción | Tasa de petróleo de los últimos 7 días al menos 25% por debajo del promedio de los 30 días previos | Advertencia |
| Caída de producción | La misma comparación con una caída de al menos 50% | Crítica |
| Corte de agua alto | Corte de agua superior a 80% en los últimos 7 días | Advertencia |
| Sin producción | Pozo productor activo con cero petróleo y gas durante 3 días | Crítica |

Reglas:

- Los umbrales son configurables. Los valores por defecto viven en `petro-calc/alerts` y la vista `well_alert` usa los mismos.
- Como los datos públicos son históricos, las reglas se evalúan respecto a la última fecha con datos de cada pozo. La interfaz muestra esa fecha junto a cada alerta.
- Un pozo abandonado o un inyector no genera alerta de falta de producción.
- Si no hay 30 días previos con datos, la regla de caída no se evalúa.

Dónde se calculan:

| Pozos | Dónde | Cómo |
| --- | --- | --- |
| Públicos | Servidor | Vista `well_alert`, servida por `GET /api/alerts` y como propiedad `alertLevel` en el GeoJSON de pozos |
| Importados | Navegador | `petro-calc/alerts.evaluate` sobre la serie guardada en IndexedDB |

Dónde se ven:

- **Mapa:** los pozos con alerta llevan un borde de color según el nivel. El color no es la única señal: el borde crítico es además más grueso.
- **Ficha:** lista las alertas activas del pozo con la cifra que las disparó.
- **Panel lateral:** reúne todas las alertas, con las críticas primero, y cada una lleva al pozo.

## Importación CSV (RF-14)

El archivo se valida y se procesa en el navegador y se guarda en IndexedDB: nunca se sube al servidor. Así la API sigue siendo de solo lectura y la demo pública no necesita cuentas de usuario.

### Formato

```csv
well,date,lat,lon,oil_sm3,gas_sm3,water_sm3,on_stream_h,bhp_bar,whp_bar,choke_pct
P-01,2026-10-21,9.7421,-63.1802,294.1,45600,50.9,24,182.4,31.6,48
P-01,2026-10-22,,,291.8,45100,51.7,24,181.9,31.4,48
P-02,2026-10-21,9.7388,-63.1755,65.2,13300,30.2,22.5,,,
```

| Columna | Obligatoria | Regla |
| --- | --- | --- |
| `well` | Sí | Texto, hasta 64 caracteres |
| `date` | Sí | `AAAA-MM-DD` |
| `lat`, `lon` | En la primera fila de cada pozo | Grados decimales, WGS 84 |
| `oil_sm3`, `gas_sm3`, `water_sm3` | Al menos una | Número mayor o igual a cero |
| `on_stream_h` | No | Entre 0 y 24; por defecto 24 |
| `bhp_bar`, `whp_bar`, `choke_pct` | No | Número; vacío significa sin dato |

### Comportamiento

- Las filas inválidas se reportan línea por línea, con el motivo. Las válidas se cargan igual.
- Los días ya cargados para un pozo se omiten, de modo que reimportar un archivo es seguro.
- Un selector permite indicar que el archivo viene en unidades de campo (bbl, Mscf, psi). La conversión a SI se hace al importar.
- Los pozos importados aparecen en el mapa como una capa aparte, con un símbolo distinto, y usan las mismas gráficas, alertas y herramientas de ingeniería.
- El usuario puede borrar un pozo importado o todos. Un aviso recuerda que los datos viven solo en ese navegador.
- Límite orientativo: 50 pozos y 200.000 filas por importación. Por encima se muestra un aviso antes de continuar.

### Capa de acceso a datos

La web no distingue de dónde viene un pozo. Una interfaz `WellRepository` tiene dos implementaciones: una que llama a la API y otra que lee IndexedDB. Las gráficas y las herramientas reciben siempre el mismo tipo `ProductionSeries`.

## Estado en la URL (RF-15)

Filtros, pozo abierto, rango de fechas y pestaña activa viven en los parámetros de la URL. Copiar la dirección comparte exactamente la misma vista.

```text
/mapa?campo=volve&estado=productor&pozo=15-9-F-12&desde=2010-01-01&hasta=2012-12-31&tab=operacion
```

| Parámetro | Contenido | Ejemplo |
| --- | --- | --- |
| `campo` | Identificador legible del campo | `volve` |
| `estado`, `tipo`, `operadora` | Filtros del mapa; admiten varios valores separados por coma | `productor,cerrado` |
| `pozo` | Identificador legible del pozo abierto | `15-9-F-12` |
| `desde`, `hasta` | Rango de fechas de las gráficas | `2010-01-01` |
| `tab` | Pestaña activa de la ficha | `operacion` |
| `vista` | Centro y zoom del mapa: `lat,lon,zoom` | `58.44,1.89,11` |
| `unidades` | `si` o `campo` | `campo` |
| `comparar` | Pozos añadidos a la comparación | `15-9-F-14,15-9-F-11` |
| `ajuste` | Ventana del ajuste de declinación: `desde,hasta` | `2011-03-01,2013-06-30` |

Reglas:

- La URL es la fuente de verdad del estado de la vista. Los componentes leen de ella y escriben en ella; no hay un estado paralelo.
- Los cambios continuos, como mover el mapa, reemplazan la entrada del historial en lugar de añadir una nueva.
- Un parámetro inválido se ignora y se usa el valor por defecto. No rompe la página.
- Los pozos importados no se pueden compartir por URL, porque no existen fuera del navegador de quien los cargó. La interfaz lo indica.
