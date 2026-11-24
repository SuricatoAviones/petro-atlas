# 0007 — Interfaz de teléfono con hojas inferiores

- **Estado:** Aceptada
- **Fecha:** 2026-11-24

## Contexto

La web se diseñó para escritorio y solo tiene un punto de ruptura a 48rem: en un teléfono, el panel de filtros ocupa casi media pantalla de forma permanente, las siete pestañas de la ficha desbordan horizontalmente y la ficha tapa los controles del mapa. Ninguna fase de `11-plan-de-fases.md` cubre el diseño móvil, así que el patrón se fija aquí antes de implementarlo.

## Decisión

Adoptar en pantallas de hasta 48rem el patrón de **hojas inferiores** (bottom sheets): el mapa ocupa toda la ventana y los paneles —filtros con importación y ficha del pozo— se abren como hojas ancladas al borde inferior, con tirador, cierre visible y, en la ficha, deslizamiento hacia abajo para cerrar. Por encima de 48rem no cambia nada: el panel de filtros sigue siendo una columna y la ficha un panel lateral. Las reglas concretas están en `17-diseno-responsive.md`.

## Alternativas descartadas

- **Panel colapsable sobre el mapa:** menos código, pero el mapa sigue perdiendo altura y los filtros compiten con la ficha por el mismo espacio.
- **Interfaz separada para móvil:** duplica componentes y mantenimiento; el mapa y las gráficas ya son fluidos.
- **Dejarlo en "lo suficientemente fluido":** es el estado actual y ya se ha probado que desborda.

## Consecuencias

- El mapa gana toda la pantalla en el teléfono. La apertura de una hoja es estado efímero de la interfaz y no se refleja en la URL; los filtros en sí siguen viviendo en la URL, como marca `09-alertas-importacion-url.md`.
- Toda hoja nueva respeta el área segura inferior, se cierra con botón visible y con teclado, y el cierre por gesto es siempre un atajo, nunca el único camino (WCAG 2.5.7).
- Las pruebas de extremo a extremo incorporan un proyecto con dispositivo móvil, y axe pasa también en móvil.
