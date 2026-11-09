# 0005 — Las alertas de pozos públicos son una vista SQL

- **Estado:** Aceptada
- **Fecha:** 2026-11-09

## Contexto

Las alertas (RF-13) deben verse en el mapa para todos los pozos a la vez, no solo para el que está abierto. Los datos públicos solo cambian cuando corre el ETL y son históricos.

## Decisión

Calcular las alertas de los pozos públicos con una vista SQL, `well_alert`, sobre `production_daily`, evaluada respecto a la última fecha con datos de cada pozo.

## Alternativas descartadas

- **Tabla de alertas escrita por el ETL:** más rápida de leer, pero añade un paso que puede quedar desincronizado con los datos.
- **Calcular en el navegador para todos los pozos:** exigiría descargar las series de todos los pozos solo para pintar el mapa.

## Consecuencias

- Sin tabla nueva ni paso extra en el ETL; las alertas siempre reflejan los datos cargados.
- La lógica de alertas existe en dos sitios: la vista SQL y `petro-calc/alerts`, que cubre los pozos importados. Una prueba compara ambas sobre los datos sintéticos para que no diverjan.
- Si la vista resulta lenta, pasa a ser materializada y el ETL la refresca al terminar, sin cambiar la API.
- Evaluar respecto a la última fecha de cada pozo significa que las alertas describen el final de su historial, no el día de hoy. La interfaz muestra esa fecha.
