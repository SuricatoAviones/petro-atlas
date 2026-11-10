# AGENTS.md

Guía para agentes de IA que trabajan en este repositorio. Es un resumen operativo: el diseño completo está en `docs/` y, si algo de aquí lo contradice, manda `docs/`.

## Qué es

PetroAtlas: un mapa de pozos petroleros con fichas de producción y presión y herramientas de ingeniería que calculan en el navegador. Monorepo pnpm con TypeScript.

| Ruta                    | Contenido                                                 |
| ----------------------- | --------------------------------------------------------- |
| `apps/web`              | Next.js (App Router) + MapLibre                           |
| `apps/api`              | Express 5, solo lectura                                   |
| `packages/petro-calc`   | Cálculos de ingeniería, TypeScript puro, sin dependencias |
| `packages/shared-types` | Tipos y esquemas Zod; solo depende de Zod                 |
| `etl`                   | Ingesta de datos públicos                                 |
| `db`                    | Migraciones SQL, seed sintético y creación de usuarios    |
| `docs`                  | Diseño: la fuente de verdad                               |

## Antes de cambiar nada

1. Lee `docs/README.md`, `docs/11-plan-de-fases.md` y `docs/12-convenciones.md`, y el documento técnico de la parte que vas a tocar.
2. Trabaja una fase a la vez y, dentro de la fase, una tarea a la vez. No adelantes trabajo de fases posteriores.
3. Si el diseño es ambiguo o contradictorio, pregunta. Si crees que está mal, propón un ADR en `docs/adr/`; no lo cambies en silencio.

## Comandos

Requisitos: Node 26 (`.nvmrc`), pnpm 12 y Docker.

```bash
pnpm install
docker compose up --detach db db-setup   # PostGIS, migraciones y datos sintéticos
pnpm dev                                 # API en :4000 y web en :3000

pnpm lint         # ESLint + Prettier
pnpm typecheck
pnpm test         # Vitest; necesita la base de datos del paso anterior. Un proyecto: pnpm test --project api
pnpm build
pnpm db:migrate
pnpm db:seed
docker compose up --build                # todo el entorno, como en el CI
```

Un cambio está terminado cuando `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan, funciona con `docker compose up` y la documentación afectada está actualizada.

## Reglas que más se rompen

- **Idioma:** código, identificadores, comentarios y commits en inglés. Documentación en español y textos de la interfaz en español e inglés, con un diccionario por idioma en `apps/web/src/messages/`.
- **TypeScript:** estricto y sin `any`. Solo sintaxis borrable (sin `enum`, `namespace` ni propiedades de parámetro), porque Node ejecuta los `.ts` directamente. Exportaciones con nombre, salvo donde el framework exige `export default`.
- **Importaciones:** relativas con extensión `.ts` en paquetes, API y `db`; en `apps/web`, sin extensión y con el alias `@/`.
- **Dependencias entre paquetes** (las comprueba ESLint): `petro-calc` no importa nada; `shared-types` solo Zod; la API no importa `petro-calc`; la web nunca accede a la base de datos.
- **Unidades:** todo en SI, con la unidad en el nombre (`bhpBar`, `oil_sm3`). Un dato ausente es `null`, nunca `0`.
- **Bordes:** lo que cruza un borde (respuesta de la API, entorno, CSV, URL, fila de la base de datos) se valida con Zod.
- **Base de datos:** cada cambio de esquema es una migración nueva en `db/migrations`; las aplicadas no se editan (el ejecutor lo detecta). SQL siempre parametrizado. La API usa el usuario de solo lectura `petroatlas_api`.
- **Datos:** el repositorio no incluye datos de terceros. El ETL descarga a `data/`, ignorada por Git. `db/seed` solo genera datos sintéticos.
- **Fórmulas y constantes:** no se transcriben de memoria sin marcarlas para verificación y sin una prueba que las respalde.
- **Versiones:** se fijan exactas. pnpm aplica una antigüedad mínima a las publicaciones; no añadas excepciones para instalar una versión publicada hace horas. TypeScript 6 y ESLint 9 son deliberados (ADR 0006).

## Git

- Rama principal `main`; ramas cortas (`feat/...`, `fix/...`, `docs/...`, `chore/...`) y PR hacia `main`. No se sube a `main` sin que pase el CI.
- Conventional Commits con ámbito: `web`, `api`, `calc`, `types`, `etl`, `db`, `docs`, `ci`. Commits pequeños, uno por tarea.
- Los commits y los PR llevan solo la autoría de quien mantiene el repositorio: sin `Co-Authored-By` ni pies de "generado con".

## Skills

Las skills de agente se versionan en `.agents/skills` (registro en `skills-lock.json`). Claude Code solo las descubre en `.claude/skills`, que no se versiona: tras clonar, `pnpm skills:link` crea ahí un enlace a `.agents/skills`. No copies skills a `.claude/`.

Para añadir skills, ejecuta `npx autoskills` en el paquete que toque, revisa lo que instala, mueve las carpetas nuevas a `.agents/skills` de la raíz, fusiona su `skills-lock.json` con el de la raíz y borra los `.agents`, `.claude` y `skills-lock.json` que deja dentro del paquete. Antes de tocar la API, consulta `nodejs-backend-patterns`, `nodejs-best-practices` y `zod`; antes de tocar la web, `react-best-practices`, `composition-patterns`, `accessibility` y `next-cache-components-adoption`.

## Al terminar una tarea

Resume qué cambió, cómo se verificó, qué decisiones se tomaron que no estaban en `docs/` y qué queda pendiente. No marques una casilla de `docs/11-plan-de-fases.md` si las pruebas no pasan.
