# Textos legales

Las páginas legales son estáticas y viven en la aplicación web:

| Ruta | Página | Contenido |
| --- | --- | --- |
| `/aviso-legal` | Aviso legal | Titular, objeto, propiedad intelectual, enlaces, responsabilidad y modificaciones |
| `/privacidad` | Privacidad | Datos técnicos, finalidad, conservación, destinatarios y derechos |
| `/datos` | Datos | Origen de los datos, conjunto sintético, cálculos y licencias |
| `/cookies` | Cookies | Ausencia de cookies propias, servicios externos y almacenamiento local |

Las cuatro están enlazadas desde el pie de página de todas las pantallas. Los textos se mantienen en `apps/web/src/messages/es.ts` y `apps/web/src/messages/en.ts`, y se renderizan con `components/legal-page.tsx`.

## Estado

- El contenido describe la aplicación tal como está construida hoy: sin cuentas, sin formularios, sin cookies y sin analítica. El idioma vive en la URL, no en una cookie.
- La privacidad menciona los registros técnicos del alojamiento y las peticiones de teselas a OpenFreeMap.
- La página de datos remite a `10-fuentes-de-datos.md` y a `/fuentes`.
- La política de cookies describe la ausencia de cookies y el uso de IndexedDB por la importación CSV: los datos se quedan en el navegador, no se suben al servidor y se pueden borrar desde la propia interfaz o desde el navegador.

## Revisión pendiente antes de la explotación pública

El texto actual es un borrador técnico, no asesoramiento jurídico. Antes de publicar la demo con un dominio propio hay que completar y revisar:

- [x] Nombre del titular: Luis Angel Gutierrez, con sitio web <https://luisangelgutierrez.com>.
- [x] País y jurisdicción: Venezuela; las controversias se someten a los tribunales competentes de Venezuela.
- [ ] NIF y domicilio completo del titular.
- [ ] Correo electrónico o formulario de contacto dedicado; el sitio web y el repositorio de GitHub no cubren por sí solos todas las obligaciones de información.
- [ ] Proveedor de alojamiento, ubicación de los servidores y contrato de encargo de tratamiento si trata datos personales. La demo usa Render, en la región de Virginia.
- [ ] Plazo concreto de conservación de los registros de acceso.
- [ ] Revisión de la política de cookies si se añade analítica, publicidad o cualquier tecnología no esencial.
- [ ] Revisión por una persona con conocimientos jurídicos antes de la puesta en producción.

## Mantenimiento

- Cualquier cambio en cookies, analítica, formularios, cuentas o tratamiento de datos actualiza `/privacidad` y `/cookies` en el mismo PR.
- Un cambio en las fuentes o en sus licencias actualiza `/datos`, `/fuentes` y `10-fuentes-de-datos.md`.
- La fecha de «Última actualización» se cambia cuando se modifica el contenido de una página.
