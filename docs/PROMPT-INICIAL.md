# Prompt inicial

Prompt para arrancar el desarrollo con un agente de IA dentro del repositorio recién creado, con la carpeta `docs/` ya copiada. Cubre solo la fase 0.

## Prompt de arranque (fase 0)

```text
Vas a construir PetroAtlas, una aplicación web de código abierto: un mapa de pozos
petroleros con fichas de producción y presión y herramientas de ingeniería que
calculan sobre los datos del pozo seleccionado.

El diseño completo está en la carpeta docs/ de este repositorio. Es la fuente de
verdad: no la reemplaces con supuestos propios.

ANTES DE ESCRIBIR CÓDIGO
1. Lee docs/README.md y, en este orden: 01-vision-y-alcance.md, 11-plan-de-fases.md,
   12-convenciones.md, 03-arquitectura.md y 05-base-de-datos.md. Lee también los
   ADR de docs/adr/.
2. Dime en pocas líneas qué entendiste que hay que construir en la fase 0 y
   lístame cualquier ambigüedad o contradicción que encuentres en docs/.
   Si hay alguna que bloquee la fase 0, pregúntame antes de seguir.

TU TAREA: SOLO LA FASE 0 (ANDAMIAJE)
Implementa las tareas de la sección "Fase 0 — Andamiaje" de
docs/11-plan-de-fases.md, ni más ni menos:
- Monorepo con pnpm workspaces: apps/web, apps/api, packages/petro-calc,
  packages/shared-types, db.
- TypeScript estricto, ESLint y Prettier compartidos desde la raíz.
- docker-compose.yml con PostgreSQL + PostGIS, API y web.
- db/migrations/0001_init.sql con exactamente el DDL de docs/05-base-de-datos.md
  (sin la vista well_alert, que es de la fase 2) y un ejecutor de migraciones simple.
- db/seed: script que genera un campo y unos 20 pozos sintéticos con un año de
  producción diaria, con nombres claramente ficticios.
- API Express con GET /api/health que comprueba la conexión a la base de datos,
  usando un usuario de solo lectura.
- Web Next.js con una página que muestra un mapa base de MapLibre GL JS.
- Vitest configurado, con una prueba real en packages/petro-calc (por ejemplo,
  una conversión de unidades de docs/08-motor-de-calculos.md).
- GitHub Actions: lint, typecheck, test y build.
- README.md, LICENSE (MIT), .env.example y .gitignore que incluya data/.

REGLAS
- Sigue docs/12-convenciones.md: código y commits en inglés, documentación en
  español, Conventional Commits, sin any, unidades en el nombre de las variables.
- Respeta las reglas de dependencia de docs/03-arquitectura.md.
- Usa la versión LTS vigente de Node y las últimas versiones estables de cada
  librería. Comprueba las versiones reales; no las asumas.
- No descargues ni incluyas datos de terceros en el repositorio.
- No adelantes trabajo de la fase 1: nada de datos reales, rutas de pozos ni filtros.
- Si crees que algo del diseño está mal, dímelo y propón un ADR en docs/adr/.
  No lo cambies por tu cuenta.
- Haz commits pequeños, uno por tarea.

CRITERIO DE CIERRE
- En una máquina limpia, `docker compose up` deja la web mostrando el mapa y
  GET /api/health responde correctamente.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
- El CI pasa.

AL TERMINAR
Dame un resumen con: qué quedó hecho, cómo lo verificaste, qué decisiones
tomaste que no estaban en docs/, y qué quedó pendiente. Marca las casillas
completadas en docs/11-plan-de-fases.md. No empieces la fase 1 hasta que
yo lo confirme.
```

## Prompt para cada fase siguiente

Sustituir `N` y el nombre de la fase.

```text
Continuamos con PetroAtlas. La fase anterior está cerrada.

1. Lee docs/11-plan-de-fases.md, sección "Fase N — <nombre>", y los documentos
   de docs/ que esa fase toca. Relee docs/12-convenciones.md.
2. Propón el orden de las tareas y dime qué dudas tienes antes de empezar.
3. Implementa una tarea a la vez. Cada tarea termina con sus pruebas, la
   documentación afectada actualizada y un commit.
4. No avances a la fase siguiente. No cambies el diseño sin proponer antes un ADR.
5. Al cerrar la fase, comprueba el criterio de cierre de la sección, marca las
   casillas y dame el resumen: hecho, verificado, decisiones nuevas y pendientes.
```

## Notas de uso

- Antes del primer prompt, crear el repositorio vacío y copiar dentro la carpeta `docs/`.
- Revisar la respuesta del paso "antes de escribir código". Es más barato corregir un malentendido ahí que en el código.
- En la fase 2, amplía el seed sintético con producción diaria y trayectorias.
- En la fase 3, pedir explícitamente que cada fórmula se contraste con su referencia y tenga una prueba contra un valor publicado. Las de `08-motor-de-calculos.md` son un punto de partida, no un resultado verificado.
