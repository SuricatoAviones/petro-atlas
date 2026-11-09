# 0004 — Monorepo con pnpm workspaces

- **Estado:** Aceptada
- **Fecha:** 2026-11-09

## Contexto

El proyecto tiene una web, una API, un paquete de cálculos, tipos compartidos y un ETL, todos en TypeScript. La web y la API deben coincidir en la forma de cada respuesta.

## Decisión

Mantener todo en un solo repositorio con pnpm workspaces, con los tipos y esquemas compartidos en `packages/shared-types`.

## Alternativas descartadas

- **Repositorios separados:** obligan a versionar y publicar los tipos para cada cambio de la API, y un evaluador tendría que saltar entre varios repositorios para entender el proyecto.
- **Una sola aplicación Next.js con rutas de API:** menos piezas, pero mezcla la capa de datos con la de presentación y muestra peor la separación de responsabilidades.

## Consecuencias

- Un cambio en la forma de una respuesta rompe la compilación en la web y en la API a la vez.
- Un solo CI y un solo `docker compose`.
- `petro-calc` vive en el monorepo pero se publica como paquete independiente; no puede depender de nada interno.
- Si el CI se vuelve lento, se añade caché de tareas antes de considerar dividir el repositorio.
