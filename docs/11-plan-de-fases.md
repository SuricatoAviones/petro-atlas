# Plan de fases

Cinco fases. Cada una termina con algo que se puede mostrar. No se empieza una fase sin cerrar la anterior.

| Fase | Entregable | Requisitos | Criterio de cierre |
| --- | --- | --- | --- |
| 0. Andamiaje | Monorepo, base de datos, CI y una página con mapa vacío | — | `docker compose up` levanta todo y el CI pasa |
| 1. Mapa | ETL de pozos y campos, mapa con filtros, ficha básica, estado en la URL | RF-01 a RF-03, RF-15 | Demo pública navegable |
| 2. Series | Producción y operación con gráficas sincronizadas, mapa de burbujas, alertas | RF-04 a RF-06, RF-13 | Las presiones de un pozo de Volve se grafican de extremo a extremo |
| 3. Ingeniería | `petro-calc` con declinación, IPR, PVT y diagnóstico | RF-07 a RF-09 | Pruebas en verde contra casos de libro de texto |
| 4. Extras | Comparación de pozos, visor LAS, exportación e importación CSV | RF-10 a RF-12, RF-14 | README con capturas y guía de instalación |

## Fase 0 — Andamiaje

Objetivo: un repositorio donde cualquier cambio posterior se pueda probar y desplegar.

- [x] Monorepo con pnpm workspaces: `apps/web`, `apps/api`, `packages/petro-calc`, `packages/shared-types`, `etl`, `db`.
- [x] TypeScript estricto, ESLint y Prettier compartidos desde la raíz.
- [x] `docker-compose.yml` con PostgreSQL + PostGIS, API y web.
- [x] `db/migrations/0001_init.sql` con el DDL de `05-base-de-datos.md` y un ejecutor de migraciones.
- [x] `db/seed`: script que genera un campo y unos 20 pozos sintéticos con un año de producción.
- [x] API con `GET /api/health` que comprueba la conexión a la base de datos.
- [x] Web con una página que muestra un mapa base de MapLibre.
- [x] Vitest configurado, con una prueba de ejemplo en `petro-calc`.
- [x] GitHub Actions: lint, tipos, pruebas y build.
- [x] `README.md`, `LICENSE` (MIT), `.env.example`, `.gitignore` con `data/`.

Cierre: en una máquina limpia, `docker compose up` deja la web en el navegador con el mapa y `/api/health` responde bien. El CI pasa en la rama principal.

## Fase 1 — Mapa

Objetivo: explorar pozos y campos reales.

- [x] ETL de Sodir: campos con polígonos y pozos con coordenadas.
- [x] `GET /api/fields`, `GET /api/fields/:id`, `GET /api/wells`, `GET /api/wells/:id`, `GET /api/meta/sources`.
- [x] Teselas vectoriales de pozos con `ST_AsMVT`.
- [x] Mapa con clustering, color por estado o tipo, y capa de campos visible según el zoom.
- [x] Panel de filtros con conteo de resultados, indicador de carga y leyenda.
- [x] Ficha del pozo con metadatos y ubicación.
- [x] Estado en la URL: filtros, pozo abierto y vista del mapa.
- [x] Página "Fuentes y licencias".
- [x] Prueba de extremo a extremo: abrir el mapa, filtrar, abrir un pozo, recargar y ver la misma vista.

Cierre: demo pública con todos los pozos de Sodir, fluida al navegar.

## Fase 2 — Series

Objetivo: ver cómo se comporta un pozo en el tiempo.

- [x] ETL de Volve: producción diaria y trayectorias, cruzadas con los pozos de Sodir.
- [x] `GET /api/wells/:id/production`, `/trajectory`, `GET /api/fields/:id/production`.
- [x] Pestañas Producción y Operación con las gráficas de `07-graficas.md`, sincronizadas.
- [x] Selector de unidades SI y de campo.
- [x] `petro-calc/units` y `petro-calc/diagnostics` (corte de agua y RGP) con pruebas.
- [x] Mapa de burbujas de acumulados.
- [x] Vista `well_alert`, `GET /api/alerts`, borde de alerta en el mapa, lista en la ficha y panel lateral.
- [x] Gráfica de trayectoria en la ficha.

Cierre: la presión de fondo de un pozo de Volve se ve en la ficha, con su fuente al pie, y coincide con el archivo original en tres fechas comprobadas a mano.

## Fase 3 — Ingeniería

Objetivo: calcular sobre los datos del pozo.

- [x] `petro-calc/dca`: ajuste de Arps, pronóstico y EUR, con pruebas.
- [x] Selección de ventana sobre la gráfica y curva de ajuste superpuesta.
- [x] `petro-calc/ipr`: Vogel, Fetkovich y compuesta, con pruebas.
- [ ] `petro-calc/pvt`: Standing, Vasquez y Beggs, Beggs y Robinson, con pruebas.
- [ ] Pestaña Ingeniería con parámetros editables y curvas que responden al instante.
- [ ] Pestaña Diagnóstico: Chan, tasa vs acumulado e índice de productividad.
- [ ] Ventana de ajuste reflejada en la URL.
- [ ] Publicar `petro-calc` en npm con su propio README.

Cierre: cobertura de 90% o más en `petro-calc` y cada fórmula con al menos una prueba contra un valor publicado.

## Fase 4 — Extras

Objetivo: cerrar el producto y dejarlo presentable.

- [ ] Comparación de pozos en una misma gráfica.
- [ ] `GET /api/wells/:id/logs` y visor de registros por pistas.
- [ ] Exportación CSV de series y resultados, y PNG de gráficas.
- [ ] Importación CSV en el navegador con IndexedDB, según `09-alertas-importacion-url.md`.
- [ ] `petro-calc/alerts` aplicado a los pozos importados.
- [ ] Revisión de accesibilidad con axe.
- [ ] README con capturas, GIF de uso, arquitectura resumida y guía de instalación.

Cierre: un visitante puede importar un CSV propio, ajustar una declinación y exportar el resultado sin leer documentación.

## Qué no entra en ninguna fase

Autenticación, edición de datos públicos, tiempo real, simulación de yacimientos y análisis nodal. Si alguno se vuelve necesario, se propone primero como ADR.

## Preguntas abiertas

- [ ] Nombre definitivo del proyecto, comprobado en GitHub y npm.
- [ ] Dónde se aloja la demo pública.
- [ ] Idioma de la interfaz en la demo: solo español o español e inglés.
