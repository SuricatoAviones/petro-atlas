# Cómo colaborar en PetroAtlas

Gracias por querer mejorar PetroAtlas. El proyecto es pequeño, así que la mejor forma de contribuir es abrir un issue antes de invertir tiempo en un cambio grande.

## Antes de empezar

1. Lee [docs/README.md](docs/README.md), [docs/11-plan-de-fases.md](docs/11-plan-de-fases.md) y [docs/12-convenciones.md](docs/12-convenciones.md).
2. Revisa los issues abiertos y el roadmap.
3. Para cambios de alcance, datos, autenticación, tiempo real o nuevas dependencias de peso, abre primero un issue o un ADR en `docs/adr/`.
4. Acepta el [Código de conducta](CODE_OF_CONDUCT.md).

## Entorno

Requisitos:

- Node 26 (`.nvmrc`)
- pnpm 12
- Docker con Docker Compose
- Chromium de Playwright para las pruebas e2e

```bash
pnpm install
cp .env.example .env
pnpm exec playwright install chromium

docker compose up --detach db db-setup
pnpm dev
```

La web queda en <http://localhost:3000> y la API en <http://localhost:4000>.

## Flujo de trabajo

1. Crea una rama corta desde `main`: `feat/...`, `fix/...`, `docs/...` o `chore/...`.
2. Haz commits pequeños con Conventional Commits y un ámbito: `web`, `api`, `calc`, `types`, `db`, `docs`, `ci`.
3. Mantén el PR centrado en una cosa.
4. Actualiza la documentación afectada en el mismo PR.
5. Abre el PR hacia `main` y espera a que el CI esté en verde.

No se hace push directo a `main`.

## Comprobaciones obligatorias

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Las pruebas de la API y las e2e necesitan la base de datos de desarrollo:

```bash
docker compose up --detach db db-setup
```

Si tocas `petro-calc`, ejecuta también:

```bash
pnpm test:coverage
```

El umbral de cobertura es del 90 %.

## Reglas de código

- TypeScript estricto, sin `any`.
- Solo sintaxis borrable: sin `enum`, `namespace` ni propiedades de parámetro.
- Exportaciones con nombre, salvo donde Next.js exige `export default`.
- Unidades SI en datos y nombres (`bhpBar`, `oil_sm3`); un ausente es `null`, nunca `0`.
- Los datos que cruzan un borde se validan con Zod.
- SQL siempre parametrizado.
- Las fórmulas y constantes se contrastan con una referencia y llevan prueba.

El detalle está en [docs/12-convenciones.md](docs/12-convenciones.md).

## Interfaz y traducciones

- Los textos de la interfaz viven en `apps/web/src/messages/es.ts` y `apps/web/src/messages/en.ts`.
- Añade la misma clave en los dos diccionarios; el tipo `Messages` falla si falta.
- Los enlaces internos deben conservar el idioma: `/es/...` o `/en/...`.
- Los gráficos nuevos necesitan nombre accesible y vista de tabla.
- Los estados de carga usan `role="status"`; los errores, `role="alert"`.
- Las pruebas de axe deben seguir pasando.

## Datos y licencias

- **No añadas datos de terceros al repositorio.** La demo usa únicamente el conjunto sintético de Venezuela de `db/seed`.
- No subas archivos de `data/`, CSV de producción real, credenciales, `.env` ni tokens.
- Si propones una fuente de datos nueva, documenta su licencia, atribución y granularidad en `docs/10-fuentes-de-datos.md` y abre un issue antes.
- Los pozos importados por un visitante se quedan en su IndexedDB; nunca se envían al servidor.

## Paquete `petro-calc`

Vive en `packages/petro-calc` y se publica como `@suricatoaviones/petro-calc`.

- No añadas dependencias de interfaz.
- Añade pruebas contra valores publicados.
- Actualiza `CHANGELOG.md` y la versión en el PR de publicación.
- Los pasos están en [docs/13-publicacion.md](docs/13-publicacion.md).

## Issues y PRs

- Usa las plantillas de issue para errores, mejoras y problemas de datos.
- En un PR, explica qué cambia, cómo se verificó y qué queda pendiente.
- Adjunta capturas si cambia la interfaz.
- No incluyas `Co-Authored-By` ni pies de herramientas generadoras.

## Seguridad

No abras un issue público para una vulnerabilidad. Sigue [SECURITY.md](SECURITY.md).

## Contacto

Puedes usar los issues del repositorio o el sitio del mantenedor: <https://luisangelgutierrez.com>.
