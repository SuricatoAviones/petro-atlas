# Demo pública

## Direcciones

| Recurso | URL |
| --- | --- |
| Web en español | <https://petroatlas-web.onrender.com/es> |
| Web en inglés | <https://petroatlas-web.onrender.com/en> |
| Estado de la API | <https://petroatlas-api.onrender.com/api/health> |
| Repositorio | <https://github.com/SuricatoAviones/petro-atlas> |
| Paquete npm | <https://www.npmjs.com/package/@suricatoaviones/petro-calc> |

## Qué es la demo

Una instancia pública de PetroAtlas con **datos sintéticos de Venezuela**. Se puede usar sin cuenta y sin instalar nada.

Incluye:

- mapa con filtros, agrupación, campos y alertas;
- fichas con series de producción y operación;
- trayectoria y registros por pistas, incluida la apertura de un LAS local;
- ajuste de declinación, IPR, PVT y diagnóstico;
- comparación de hasta ocho pozos;
- importación de CSV en IndexedDB y exportación CSV/PNG;
- español e inglés.

## Aviso importante sobre los datos

El conjunto es ficticio:

- campo **CAMPO ESCUELA VENEZUELA**;
- pozos **VE-01** a **VE-20**;
- generado por `db/seed`, no son mediciones reales;
- no representa ningún campo, operadora o pozo existente;
- no se usan datos de Sodir, Volve ni Diskos.

Los cálculos son estimaciones basadas en correlaciones publicadas. No son asesoramiento de ingeniería ni sustituyen un estudio de yacimiento.

## Límites actuales

- El plan gratuito de Render suspende los servicios sin tráfico y puede tardar en despertar.
- La base gratuita tiene caducidad y capacidad limitada.
- No hay cuentas, autenticación ni datos compartidos entre visitantes.
- Los CSV importados y los LAS abiertos viven solo en el navegador de cada visitante.
- No hay analítica, publicidad ni cookies de seguimiento.
- La demo no garantiza disponibilidad continua.

## Privacidad

- El idioma vive en la URL (`/es` o `/en`), no en una cookie.
- No hay cuentas ni formularios.
- El alojamiento puede registrar IP, fecha, ruta y agente de usuario en sus logs.
- El mapa pide teselas a OpenFreeMap.
- La importación CSV usa IndexedDB y nunca envía el archivo al servidor.

Detalle en [14-textos-legales.md](14-textos-legales.md) y en las páginas `/es/privacidad` y `/es/cookies`.

## Operación

La demo se despliega con `render.yaml`:

- `petroatlas-web`: Next.js;
- `petroatlas-api`: Express;
- `petroatlas-db`: PostgreSQL + PostGIS.

Después de un despliegue que cambie datos o esquema:

```powershell
$env:ETL_DATABASE_URL='postgres://...'
pnpm db:migrate
pnpm db:seed
```

Pasos completos en [15-despliegue.md](15-despliegue.md).

## Antes de una difusión amplia

- [ ] Completar NIF, domicilio y contacto dedicado del titular.
- [ ] Revisar el contrato de encargo de tratamiento con Render.
- [ ] Definir el plazo de conservación de logs.
- [ ] Revisar los textos legales con una persona con conocimientos jurídicos.
- [ ] Cambiar la API al rol de solo lectura `petroatlas_api`.
- [ ] Configurar backups y probar una restauración.
- [ ] Configurar monitorización de `/api/health` y de la web.
- [ ] Pasar a planes de pago si la demo debe estar siempre disponible.
- [ ] Configurar un dominio propio, si se decide.
- [ ] Revisar accesibilidad con NVDA o VoiceOver; ver [16-accesibilidad.md](16-accesibilidad.md).

## Cómo colaborar

- Errores y mejoras: issues del repositorio.
- Guía completa: [CONTRIBUTING.md](../CONTRIBUTING.md).
- Conducta: [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
- Vulnerabilidades: [SECURITY.md](../SECURITY.md), nunca en un issue público.
- Traducciones: `apps/web/src/messages/es.ts` y `en.ts`.
- Datos: no se aceptan datos de terceros en Git; propón la fuente en un issue.
