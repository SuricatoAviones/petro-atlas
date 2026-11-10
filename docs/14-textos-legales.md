# Textos legales

Las páginas legales son estáticas y viven en la aplicación web:

| Ruta | Página | Contenido |
| --- | --- | --- |
| `/aviso-legal` | Aviso legal | Titular, objeto, propiedad intelectual, enlaces, responsabilidad y modificaciones |
| `/privacidad` | Privacidad | Datos técnicos, finalidad, conservación, destinatarios y derechos |
| `/datos` | Datos | Origen de los datos, conjunto sintético, cálculos y licencias |
| `/cookies` | Cookies | Ausencia de cookies propias, servicios externos y almacenamiento local |

Las cuatro están enlazadas desde el pie de página de todas las pantallas. Los textos se mantienen en `apps/web/src/messages/es.ts` y se renderizan con `components/legal-page.tsx`.

## Estado

- El contenido describe la aplicación tal como está construida hoy: sin cuentas, sin formularios, sin cookies y sin analítica.
- La privacidad menciona los registros técnicos del alojamiento y las peticiones de teselas a OpenFreeMap.
- La página de datos remite a `10-fuentes-de-datos.md` y a `/fuentes`.
- La política de cookies se actualizará antes de activar la importación CSV con IndexedDB.

## Revisión pendiente antes de la explotación pública

El texto actual es un borrador técnico, no asesoramiento jurídico. Antes de publicar la demo con un dominio propio hay que completar y revisar:

- [ ] Identidad legal completa del titular: nombre o razón social, NIF y domicilio.
- [ ] Correo electrónico o formulario de contacto dedicado; el repositorio de GitHub no basta para todas las obligaciones de información.
- [ ] País y jurisdicción aplicables, y texto de resolución de conflictos.
- [ ] Proveedor de alojamiento, ubicación de los servidores y contrato de encargo de tratamiento si trata datos personales.
- [ ] Plazo concreto de conservación de los registros de acceso.
- [ ] Revisión de la política de cookies si se añade analítica, publicidad o cualquier tecnología no esencial.
- [ ] Revisión por una persona con conocimientos jurídicos antes de la puesta en producción.

## Mantenimiento

- Cualquier cambio en cookies, analítica, formularios, cuentas o tratamiento de datos actualiza `/privacidad` y `/cookies` en el mismo PR.
- Un cambio en las fuentes o en sus licencias actualiza `/datos`, `/fuentes` y `10-fuentes-de-datos.md`.
- La fecha de «Última actualización» se cambia cuando se modifica el contenido de una página.
