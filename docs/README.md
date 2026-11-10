# Documentación de PetroAtlas

PetroAtlas es un explorador web de campos petroleros: un mapa de pozos como entrada, fichas con gráficas de producción y presión, y herramientas de ingeniería que calculan sobre los datos reales del pozo seleccionado. El nombre es provisional.

Esta carpeta es la fuente de verdad del diseño. Si el código y la documentación no coinciden, uno de los dos está mal y se corrige en el mismo PR.

## Índice

| Documento | Contenido |
| --- | --- |
| [01-vision-y-alcance.md](01-vision-y-alcance.md) | Qué es, para quién, requisitos funcionales y no funcionales, glosario |
| [02-casos-de-uso.md](02-casos-de-uso.md) | Actores y casos de uso |
| [03-arquitectura.md](03-arquitectura.md) | Componentes, stack y estructura del repositorio |
| [04-modelo-de-dominio.md](04-modelo-de-dominio.md) | Diagrama de clases y tipos compartidos |
| [05-base-de-datos.md](05-base-de-datos.md) | Diagrama entidad-relación, DDL, vista de alertas, reglas de migración |
| [06-api.md](06-api.md) | Rutas REST, parámetros, formatos de respuesta y errores |
| [07-graficas.md](07-graficas.md) | Catálogo de gráficas y reglas de comportamiento |
| [08-motor-de-calculos.md](08-motor-de-calculos.md) | Paquete `petro-calc`: módulos, firmas, fórmulas y casos de validación |
| [09-alertas-importacion-url.md](09-alertas-importacion-url.md) | Alertas, importación CSV y estado en la URL |
| [10-fuentes-de-datos.md](10-fuentes-de-datos.md) | Sodir, Diskos y Volve: qué aportan, licencias y reglas del ETL |
| [11-plan-de-fases.md](11-plan-de-fases.md) | Fases 0 a 4 con tareas y criterios de cierre |
| [12-convenciones.md](12-convenciones.md) | Reglas de código, Git, pruebas, seguridad y definición de terminado |
| [13-publicacion.md](13-publicacion.md) | Publicación de `petro-calc` en npm: requisitos, versiones y verificación |
| [14-textos-legales.md](14-textos-legales.md) | Páginas legales, estado y revisión pendiente antes de la explotación pública |
| [15-despliegue.md](15-despliegue.md) | Despliegue en Render: Blueprint, base de datos, migraciones y limitaciones |
| [adr/](adr/README.md) | Decisiones de arquitectura registradas |
| [PROMPT-INICIAL.md](PROMPT-INICIAL.md) | Prompt para arrancar el desarrollo con un agente de IA |

## Orden de lectura

1. `01-vision-y-alcance.md` y `11-plan-de-fases.md` para saber qué se construye y en qué orden.
2. `12-convenciones.md` antes de escribir la primera línea de código.
3. El documento técnico de la parte que se va a tocar (base de datos, API, cálculos).

## Reglas de esta carpeta

- Todo cambio de esquema, de API o de fórmula actualiza su documento en el mismo PR.
- Una decisión que contradice lo escrito aquí se registra primero como ADR en `adr/`.
- Los diagramas se escriben en Mermaid dentro del Markdown, para que GitHub los dibuje y se puedan revisar en un diff.
- Las preguntas abiertas viven al final de `10-fuentes-de-datos.md` y de `11-plan-de-fases.md`. Se cierran con un ADR o con un cambio en el documento afectado.
