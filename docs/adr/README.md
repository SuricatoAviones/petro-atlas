# Decisiones de arquitectura (ADR)

Cada decisión que da forma al sistema queda escrita aquí: qué se decidió, por qué y qué se descartó.

| ADR | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-calculos-en-el-navegador.md) | Los cálculos de ingeniería corren en el navegador | Aceptada |
| [0002](0002-csv-importado-en-el-navegador.md) | El CSV importado se guarda en IndexedDB, sin servidor | Aceptada |
| [0003](0003-postgis-y-teselas-vectoriales.md) | PostgreSQL + PostGIS con teselas vectoriales | Aceptada |
| [0004](0004-monorepo-pnpm.md) | Monorepo con pnpm workspaces | Aceptada |
| [0005](0005-alertas-como-vista-sql.md) | Las alertas de pozos públicos son una vista SQL | Aceptada |
| [0006](0006-typescript-6-y-eslint-9.md) | TypeScript 6 y ESLint 9 en lugar de las últimas versiones | Propuesta |

## Cómo añadir una

1. Copiar [plantilla.md](plantilla.md) con el siguiente número: `0006-titulo-corto.md`.
2. Escribirla antes de implementar el cambio.
3. Añadirla a la tabla de arriba.
4. Un ADR aceptado no se edita. Si la decisión cambia, se escribe otro que lo reemplaza y el anterior pasa a estado "Reemplazada por 00NN".
