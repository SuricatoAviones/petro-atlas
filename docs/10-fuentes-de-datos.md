# Fuentes de datos

Dos fuentes públicas noruegas cubren el diseño: Sodir da la cobertura geográfica del mapa y Volve da el detalle diario por pozo, incluidas las presiones.

## Fuentes

| Fuente | Qué aporta | Granularidad | Condiciones |
| --- | --- | --- | --- |
| [Sodir FactPages](https://factpages.sodir.no/en/wellbore/Attributes) | Pozos con coordenadas y atributos, polígonos de campos, producción | Producción mensual y anual por campo | Datos abiertos del Norwegian Offshore Directorate |
| [Diskos](https://www.sodir.no/en/diskos/production/) | Producción por pozo | Mensual, pública dos años después del mes reportado | Portal público de Diskos |
| [Volve, Equinor](https://equinor.com/energy/volve-data-sharing) | Producción con presión y temperatura de fondo y de cabezal, choke, registros y datos de perforación | Diaria por pozo, 2008 a 2016, un solo campo | Equinor Open Data Licence: sin reventa y con atribución |

## Reglas de licencia

- El repositorio no incluye datos de terceros. El ETL los descarga a `data/`, que está en `.gitignore`.
- `db/seed/` contiene solo datos sintéticos, generados por un script, para desarrollo y pruebas.
- La interfaz muestra la atribución de cada fuente al pie de las gráficas y en una página "Fuentes y licencias".
- El `README.md` enlaza las licencias y explica cómo obtener los datos.
- Antes de publicar la demo se confirma el texto exacto de cada licencia. Ver preguntas abiertas.

## Sodir FactPages

Comprobado contra las exportaciones reales el 2026-11-09. El ETL (`pnpm etl:sodir`) descarga cuatro archivos a `data/sodir/`:

| Archivo | Origen | Contenido |
| --- | --- | --- |
| `wellbore_exploration_all.csv` | Vista de tabla de FactPages | Pozos de exploración |
| `wellbore_development_all.csv` | Vista de tabla de FactPages | Pozos de desarrollo |
| `field.csv` | Vista de tabla de FactPages | Campos, operadora y estado |
| `field_outlines.geojson` | Servicio de mapas de Sodir, capa 7100 | Polígonos de los campos |

Columnas que se usan:

| Columna de origen | Destino | Nota |
| --- | --- | --- |
| `wlbWellboreName` | `well.name` | Nombre oficial |
| `wlbNsDecDeg`, `wlbEwDecDeg` | `well.geom` | Grados decimales en **ED50** (EPSG:4230); se transforman a EPSG:4326 al cargar, unos 100 m de diferencia |
| `wlbEntryDate` | `well.spud_date` | Formato `DD.MM.AAAA`. `wlbCompletionDate` es la fecha de terminación y no se usa |
| `wlbTotalDepth` | `well.total_depth_m` | m |
| `wlbField` | `well.field_id` | Se cruza con `fldName` |
| `wlbPurpose` | `well.well_type` | Ver traducción abajo |
| `wlbStatus` | `well.status` | Ver traducción abajo |
| `fldName` | `field.name` | |
| `cmpLongName` | `field.operator` | Operadora actual del campo |
| `fldCurrentActivitySatus` | `field.status` | El nombre de la columna viene así escrito en la fuente |
| `fldNpdidField` | cruce con los polígonos | |

Traducción a las enumeraciones de `04-modelo-de-dominio.md`:

| Valor de Sodir | Valor en PetroAtlas |
| --- | --- |
| Archivo de exploración (cualquier `wlbPurpose`) | tipo `exploration` |
| `PRODUCTION` | tipo `producer` |
| `INJECTION`, `INJECTION-CCS` | tipo `injector` |
| `OBSERVATION` | tipo `observation` |
| Otro propósito o vacío | tipo `NULL` |
| `PRODUCING` | estado `producing` |
| `INJECTING` | estado `injecting` |
| `PRODUCING/INJECTING` | `injecting` si el pozo es inyector; si no, `producing` |
| `CLOSED`, `SUSPENDED` | estado `shut_in` |
| `PLUGGED`, `P&A`, `JUNKED` | estado `abandoned` |
| Cualquier otro o vacío | estado `unknown` |
| Campo `Producing` / `Shut down` / `Approved for production` | `producing` / `shut_down` / `approved` |

Decisiones:

- No se cargan los pozos "otros" de Sodir (`wellbore_other_all`: sondeos de suelo, gas somero, científicos). No son pozos petroleros y no encajan en `well_type`.
- Los pozos con estado `WILL NEVER BE DRILLED` se descartan y se cuentan en el informe.
- La operadora de un pozo es la de su campo. Los pozos sin campo no tienen operadora.
- Algunos polígonos publicados tienen anillos que se cruzan; se reparan al cargar con `ST_MakeValid`.
- Un campo sin polígono publicado se carga con geometría `NULL`.

Primera carga completa: 142 campos (141 con polígono) y 8.357 pozos de 8.492 leídos; 135 descartados por no haberse perforado nunca.

## Volve

Los datos de producción vienen en un archivo Excel con una hoja diaria y otra mensual. Mapeo previsto de la hoja diaria a `production_daily`:

| Columna de origen | Columna destino | Unidad |
| --- | --- | --- |
| `DATEPRD` | `date` | |
| `NPD_WELL_BORE_NAME` | clave de cruce con `well.name` | |
| `ON_STREAM_HRS` | `on_stream_h` | h |
| `AVG_DOWNHOLE_PRESSURE` | `bhp_bar` | bar |
| `AVG_DOWNHOLE_TEMPERATURE` | `bht_c` | °C |
| `AVG_WHP_P` | `whp_bar` | bar |
| `AVG_WHT_P` | `wht_c` | °C |
| `AVG_CHOKE_SIZE_P` | `choke_pct` | % |
| `BORE_OIL_VOL` | `oil_sm3` | Sm³ |
| `BORE_GAS_VOL` | `gas_sm3` | Sm³ |
| `BORE_WAT_VOL` | `water_sm3` | Sm³ |
| `BORE_WI_VOL` | `water_inj_sm3` | Sm³ |
| `WELL_TYPE` | `well.well_type` | |

Esta tabla se escribió de memoria. El primer paso del ETL de Volve es abrir el archivo real y corregirla si algún nombre o unidad difiere. La unidad del choke viene en una columna aparte y hay que comprobarla.

Las coordenadas de los pozos de Volve no están en el archivo de producción: se obtienen cruzando el nombre oficial del pozo con Sodir.

## Reglas del ETL

1. **Idempotente.** Correrlo dos veces deja la base de datos igual. Se usa `INSERT ... ON CONFLICT DO UPDATE`.
2. **Por etapas.** Descargar, validar, normalizar y cargar son pasos separados. Un fallo en uno no deja datos a medias: cada fuente se carga dentro de una transacción.
3. **Unidades.** Todo se convierte a SI antes de cargar. La conversión usa las mismas constantes que `petro-calc/units`.
4. **Ausentes.** Una celda vacía se carga como `NULL`. No se inventan ceros.
5. **Valores imposibles.** Volúmenes negativos, horas fuera de 0 a 24 y coordenadas fuera de rango se descartan y se cuentan en el informe.
6. **Nombres de pozo.** Se guardan con el nombre oficial de la fuente. El identificador legible para la URL se deriva de él sustituyendo `/` y espacios por `-`.
7. **Registro.** Cada corrida escribe un resumen: filas leídas, cargadas, descartadas y por qué. `data_source.ingested_at` se actualiza al terminar bien.
8. **Sin datos en Git.** Los archivos descargados quedan en `data/`.

### Comandos previstos

```bash
pnpm etl:sodir     # campos y pozos
pnpm etl:volve     # producción diaria, trayectorias y registros de Volve
pnpm etl:all       # todo, en orden
pnpm db:seed       # datos sintéticos para desarrollo, sin descargar nada
```

## Preguntas abiertas

- [ ] Confirmar el texto exacto de la licencia de Sodir antes de publicar la demo.
- [ ] Confirmar si la licencia de Volve permite que la demo pública sirva los datos tal cual, o si conviene limitarla a datos agregados.
- [ ] Decidir si la demo pública incluye la producción mensual por pozo de Diskos.
- [ ] Comprobar los nombres reales de columnas de Volve y corregir este documento. Los de Sodir ya están comprobados.
