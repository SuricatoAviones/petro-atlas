# 0002 — El CSV importado se guarda en IndexedDB, sin servidor

- **Estado:** Aceptada
- **Fecha:** 2026-11-09

## Contexto

El visitante debe poder analizar sus propios pozos (RF-14). El sistema no tiene cuentas de usuario y la demo es pública. Los datos de producción de una empresa suelen ser confidenciales.

## Decisión

Validar y procesar el CSV en el navegador y guardarlo en IndexedDB. El archivo nunca se envía al servidor.

## Alternativas descartadas

- **Subir el CSV a la API:** exige autenticación, separación de datos por usuario, cuotas y una política de retención. Convierte una demo de solo lectura en un servicio que custodia datos ajenos.
- **Mantener los datos solo en memoria:** se pierden al recargar la página, lo que hace la función poco útil.

## Consecuencias

- La API sigue siendo de solo lectura y la demo no necesita cuentas.
- Los datos del usuario no salen de su equipo, y la interfaz puede decirlo con claridad.
- Los pozos importados no se pueden compartir por URL ni ver desde otro dispositivo.
- La web necesita una capa de acceso a datos con dos orígenes: API e IndexedDB.
- Las alertas de los pozos importados se calculan en el navegador, con la misma lógica que la vista SQL. Hay que mantener ambas alineadas.
- Si más adelante se quiere persistencia en servidor, hace falta un ADR nuevo que cubra autenticación.
