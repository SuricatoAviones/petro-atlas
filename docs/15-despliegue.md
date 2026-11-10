# Despliegue en Render

Render aloja la web de Next.js, la API de Express y PostgreSQL + PostGIS en un mismo proveedor. El repositorio incluye `render.yaml` como Blueprint.

## Recursos

| Recurso          | Tipo              | Plan inicial | Notas                                            |
| ---------------- | ----------------- | ------------ | ------------------------------------------------ |
| `petroatlas-web` | Web Service Node  | `free`       | Next.js; se suspende sin tráfico en el plan free |
| `petroatlas-api` | Web Service Node  | `free`       | Express; el navegador la llama directamente      |
| `petroatlas-db`  | PostgreSQL 16     | `free`       | PostGIS; los planes gratuitos caducan            |

El Blueprint crea los tres recursos dentro del proyecto `PetroAtlas`, entorno `Production`. Si el proyecto o el entorno tienen otro nombre, cámbialos en `render.yaml` antes de sincronizar.

## Procedimiento

1. Confirma que la rama que vas a desplegar tiene `render.yaml` y que el CI pasa.
2. En Render: **New → Blueprint**, conecta el repositorio y elige la rama.
3. Revisa los recursos que va a crear y pulsa **Deploy Blueprint**.
4. Espera a que la API responda en `https://petroatlas-api.onrender.com/api/health`.
5. Carga el esquema y los datos desde tu máquina, usando la **External Database URL** de Render:

   ```powershell
   $env:ETL_DATABASE_URL='postgres://...@.../petroatlas?sslmode=require'
   pnpm db:migrate
   pnpm db:seed       # datos sintéticos de Venezuela
   ```

6. Abre `https://petroatlas-web.onrender.com` y comprueba el mapa y la ficha de un pozo.

`NEXT_PUBLIC_API_URL` y `WEB_ORIGIN` se resuelven con `RENDER_EXTERNAL_URL` de cada servicio. Si usas dominios propios, actualízalos en el panel y vuelve a desplegar la web: `NEXT_PUBLIC_*` se inyecta durante el build.

## Puerto

Render inyecta `PORT` (10000 por defecto). `apps/api/src/config.ts` lo acepta como alternativa a `API_PORT`; `API_PORT` sigue teniendo prioridad para el desarrollo local y Docker Compose. La web arranca con `next start --port $PORT` porque su script fija el 3000.

## Rol de solo lectura (recomendado)

El Blueprint entrega a la API la conexión del usuario propietario de la base de datos. Para que la API use el rol `petroatlas_api` de `docs/05`:

1. Crea el rol y sus permisos con una conexión de administrador:

   ```sql
   CREATE ROLE petroatlas_api LOGIN PASSWORD '...';
   GRANT CONNECT ON DATABASE petroatlas TO petroatlas_api;
   GRANT USAGE ON SCHEMA public TO petroatlas_api;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO petroatlas_api;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT SELECT ON TABLES TO petroatlas_api;
   ```

2. Sustituye `API_DATABASE_URL` en el servicio de la API por la conexión interna con ese rol. Si quieres que el Blueprint no la sobrescriba, quita ese `envVar` del YAML o decláralo con `sync: false`.
3. Reinicia la API y verifica que las lecturas siguen funcionando y que una escritura falla.

## Limitaciones del plan gratuito

- Los web services gratuitos se suspenden tras un periodo sin tráfico; la primera visita tarda en despertar.
- Las bases de datos gratuitas tienen caducidad y almacenamiento limitado.
- El limitador de peticiones de Express vive en memoria: con una sola instancia es suficiente; con varias, cada instancia cuenta por separado.

## Datos y licencias

El despliegue no cambia las reglas de `10-fuentes-de-datos.md`: la demo usa solo el conjunto sintético de Venezuela y no redistribuye datos de terceros.
