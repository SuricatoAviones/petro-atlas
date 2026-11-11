# Seguridad

## Versiones soportadas

La rama `main` y el último despliegue de la demo reciben correcciones de seguridad. No se mantienen ramas antiguas.

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa una [consulta privada de seguridad de GitHub](https://github.com/SuricatoAviones/petro-atlas/security/advisories/new).

Incluye, si puedes:

- descripción del problema y componente afectado (web, API, base de datos, paquete);
- pasos para reproducirlo y versión o commit;
- impacto esperado;
- una prueba de concepto mínima, sin datos personales ni credenciales;
- una propuesta de corrección, si la tienes.

Recibirás una confirmación y una valoración inicial en la medida de lo posible. El proyecto es mantenido por una persona, así que no se promete un plazo formal.

## Alcance

Se consideran problemas de seguridad, entre otros:

- inyección SQL o exposición de datos a través de la API;
- ejecución de código o XSS en la web;
- validación insuficiente de CSV, LAS o parámetros de URL;
- filtración de secretos o credenciales;
- configuración incorrecta de CORS, cabeceras o permisos de base de datos;
- dependencias con vulnerabilidades conocidas y explotables.

No son vulnerabilidades:

- la exactitud de los datos sintéticos o de los cálculos de ingeniería;
- que la demo gratuita de Render se suspenda por inactividad;
- que GitHub Packages exija autenticación.

## Buenas prácticas del proyecto

- La API usa el rol de solo lectura `petroatlas_api`.
- Los pozos importados nunca salen del navegador.
- Los datos que cruzan un borde se validan con Zod.
- Las dependencias se actualizan con Dependabot.
- Los secretos viven en variables de entorno, nunca en el repositorio.
- No se aceptan datos de terceros ni archivos `data/` en Git.

## Divulgación

Se coordinará la divulgación contigo después de publicar la corrección. Se dará crédito si lo deseas.
