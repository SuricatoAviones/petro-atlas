# PetroAtlas

Explorador web de campos petroleros, de código abierto: un mapa de pozos como entrada, fichas con gráficas de producción y presión, y herramientas de ingeniería que calculan sobre los datos del pozo seleccionado. El nombre es provisional.

> **Estado: fase 3 funcionalmente completa y textos legales publicados.** El mapa muestra los pozos y campos públicos de Sodir con clustering, filtros, ficha de pozo, estado en la URL, series de producción y operación, mapa de burbujas, alertas, ajuste de declinación, calculadoras IPR y PVT, y diagnóstico de Chan. `petro-calc` supera el 90 % de cobertura. La web incluye aviso legal, privacidad, datos y cookies. Queda publicar el paquete en npm y desarrollar la fase 4. El plan completo está en [docs/11-plan-de-fases.md](docs/11-plan-de-fases.md).

## Arranque rápido

Requisito: [Docker](https://docs.docker.com/get-docker/) con Docker Compose.

```bash
git clone <url-del-repositorio> petroatlas
cd petroatlas
docker compose up --build
```

Cuando termina de arrancar:

| Qué                  | Dónde                                         |
| -------------------- | --------------------------------------------- |
| Web con el mapa      | <http://localhost:3000>                       |
| Estado de la API     | <http://localhost:4000/api/health>            |
| PostgreSQL + PostGIS | `localhost:55432`, base de datos `petroatlas` |

`docker compose up` crea los usuarios de base de datos, aplica las migraciones y carga un campo sintético con 20 pozos y un año de producción diaria. No hace falta ningún archivo `.env`: todos los valores tienen un valor por defecto de desarrollo. Para cambiarlos (puertos, contraseñas), copia `.env.example` a `.env`.

Para empezar de cero, borrando la base de datos: `docker compose down --volumes`.

## Desarrollo local

Requisitos: Node 26 (LTS, ver `.nvmrc`), pnpm 12 y Docker para la base de datos.

```bash
pnpm install
cp .env.example .env
pnpm exec playwright install chromium    # solo la primera vez, para las pruebas e2e

docker compose up --detach db db-setup   # base de datos, migraciones y datos sintéticos
pnpm dev                                 # API en :4000 y web en :3000, con recarga
```

| Comando              | Qué hace                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`           | API y web en modo desarrollo                                            |
| `pnpm lint`          | ESLint y comprobación de formato con Prettier                           |
| `pnpm format`        | Aplica el formato de Prettier                                           |
| `pnpm typecheck`     | `tsc --noEmit` en todos los paquetes                                    |
| `pnpm test`          | Pruebas con Vitest; las de la API necesitan la base de datos en marcha  |
| `pnpm test:coverage` | Cobertura de `petro-calc`; falla por debajo del 90%                     |
| `pnpm test:e2e`      | Pruebas de extremo a extremo con Playwright; necesitan la base de datos |
| `pnpm build`         | Compila paquetes, API y web                                             |
| `pnpm db:migrate`    | Aplica las migraciones pendientes de `db/migrations`                    |
| `pnpm db:seed`       | Carga los datos sintéticos; se puede repetir sin duplicar nada          |
| `pnpm etl:sodir`     | Descarga los pozos y campos públicos de Sodir a `data/` y los carga     |
| `pnpm etl:volve`     | Carga la producción y las trayectorias de Volve desde `data/volve`      |

Un cambio está terminado cuando `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan. El resto de reglas está en [docs/12-convenciones.md](docs/12-convenciones.md).

## Estructura

```text
apps/web/               Next.js: mapa, ficha de pozo, herramientas
apps/api/               Express: API REST de solo lectura
packages/petro-calc/    Cálculos de ingeniería en TypeScript puro
packages/shared-types/  Tipos y esquemas Zod compartidos
etl/                    Ingesta de datos públicos (Sodir)
db/migrations/          SQL versionado
db/seed/                Generador de datos sintéticos
db/init/                Creación de usuarios al inicializar PostgreSQL
docs/                   Diseño: la fuente de verdad del proyecto
```

La web pide datos a la API y calcula en el navegador con `petro-calc`. La API lee la base de datos con un usuario de solo lectura. Solo el ETL, las migraciones y el seed escriben. El detalle está en [docs/03-arquitectura.md](docs/03-arquitectura.md) y las decisiones, en [docs/adr/](docs/adr/README.md).

## Datos y licencias

- El código se publica bajo licencia [MIT](LICENSE).
- El repositorio **no incluye datos de terceros**. Los datos de `db/seed` son sintéticos: los genera un script, llevan nombres ficticios (`SYNTHETIC ALPHA`, `SYN-A-01`…) y no representan ningún campo real.
- El ETL descarga los datos públicos de Sodir a `data/`, que Git ignora. Volve se obtiene de Equinor (Databricks Marketplace) y se coloca en `data/volve/`; el ETL lo normaliza y lo carga. Las fuentes y sus condiciones están en [docs/10-fuentes-de-datos.md](docs/10-fuentes-de-datos.md).
- El mapa base usa las teselas de [OpenFreeMap](https://openfreemap.org/), con datos de © OpenMapTiles y © OpenStreetMap. Se puede cambiar con `NEXT_PUBLIC_MAP_STYLE_URL`.

## Documentación

Todo el diseño vive en [docs/](docs/README.md). Si el código y la documentación no coinciden, uno de los dos está mal y se corrige en el mismo PR.
