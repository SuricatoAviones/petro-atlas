# 0003 — PostgreSQL + PostGIS con teselas vectoriales

- **Estado:** Aceptada
- **Fecha:** 2026-11-09

## Contexto

El mapa debe mostrar del orden de 10.000 pozos con fluidez, filtrarlos por atributos y por área visible, y dibujar polígonos de campos. Los datos son relacionales y espaciales a la vez.

## Decisión

Usar PostgreSQL con PostGIS como única base de datos y servir los pozos al mapa como teselas vectoriales generadas con `ST_AsMVT`. Las consultas de detalle usan GeoJSON.

## Alternativas descartadas

- **GeoJSON completo en una sola respuesta:** simple, pero pesa demasiado con miles de pozos y obliga al navegador a agrupar todo.
- **Archivos de teselas pregenerados (PMTiles):** muy rápidos y baratos de servir, pero los filtros por atributo se vuelven rígidos y cada ingesta exige regenerarlos.
- **SQL Server con tipos espaciales:** capaz, pero sin generación de teselas integrada y con menos ecosistema abierto para mapas.

## Consecuencias

- Un solo motor para datos, consultas espaciales y teselas.
- Las consultas espaciales y de teselas se escriben en SQL directo, no a través de un ORM.
- Las teselas se pueden cachear, porque los datos solo cambian con una ingesta.
- Si el volumen crece mucho, pregenerar teselas queda como optimización posible sin cambiar el modelo.
