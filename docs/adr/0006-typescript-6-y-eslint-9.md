# 0006 — TypeScript 6 y ESLint 9 en lugar de las últimas versiones

- **Estado:** Aceptada
- **Fecha:** 2026-11-09

## Contexto

`03-arquitectura.md` pide usar las últimas versiones estables de cada librería. Al crear el repositorio, las últimas eran TypeScript 7.0.2 y ESLint 10.14.0, pero el resto de las herramientas no las admite todavía:

- TypeScript 7 ya no expone la API del compilador. `typescript-eslint` 8 declara `typescript <6.1.0`, y sin él no se puede hacer cumplir la regla "sin `any`" de `12-convenciones.md`.
- Los plugins `react`, `import` y `jsx-a11y` que trae `eslint-config-next` 16 declaran `eslint ^9` como máximo.

## Decisión

Fijar TypeScript 6.0.3 y ESLint 9.39.5, las últimas versiones que admite todo el conjunto de herramientas, y subir a las siguientes en cuanto `typescript-eslint` y `eslint-config-next` las soporten.

## Alternativas descartadas

- **TypeScript 7 sin `typescript-eslint`:** deja el lint sin reglas con información de tipos, que son las que detectan `any`, promesas sin esperar y comprobaciones innecesarias.
- **ESLint 10 sin las reglas de Next:** se pierden las reglas de React, de hooks y de accesibilidad en `apps/web`.
- **Forzar las versiones ignorando las dependencias declaradas:** puede funcionar o fallar de forma silenciosa, y no se puede comprobar en el CI.

## Consecuencias

- El lint estricto y las reglas de dependencia de `03-arquitectura.md` funcionan desde la fase 0.
- El proyecto queda una versión mayor por detrás en dos herramientas de desarrollo. No afecta al código que se ejecuta.
- ESLint 9 está en mantenimiento: la subida a ESLint 10 queda pendiente y hay que revisarla al empezar cada fase.
- El código ya se escribe solo con sintaxis borrable (`erasableSyntaxOnly`), así que el cambio a TypeScript 7 no debería exigir cambios en las fuentes.
