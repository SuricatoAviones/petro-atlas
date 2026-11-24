# Diseño responsivo

Reglas para que la web funcione igual de bien en un escritorio y en un teléfono. La decisión de patrón está en el [ADR 0007](adr/0007-interfaz-movil-con-hojas-inferiores.md); esta página recoge las reglas concretas que la aplican y que debe respetar cualquier vista nueva.

## Puntos de ruptura

| Rango | Dispositivo | Patrón |
| --- | --- | --- |
| Hasta 48rem | Teléfonos y tabletas verticales | Mapa a pantalla completa con hojas inferiores |
| Más de 48rem | Escritorio | Columna de filtros fija y ficha lateral |

- Un solo punto de ruptura: 48rem. No se añaden rangos intermedios sin una razón que se vea en una pantalla real.
- El ancho de referencia mínimo es 360 px: ninguna vista puede desbordar a ese ancho, y las pruebas de extremo a extremo lo comprueban con un dispositivo Pixel 7.
- Las hojas y las barras pegadas al borde inferior respetan `env(safe-area-inset-bottom)`.

## Hojas inferiores

Una hoja (filtros, importación, ficha del pozo) anclada al borde inferior:

- Se abre con un control visible en la capa del mapa y se cierra con un botón con `aria-label`, con Escape y tocando el velo.
- Lleva un tirador en la barra superior, tanto visual como táctil. El deslizamiento hacia abajo para cerrar usa eventos de puntero sobre esa barra, nunca sobre el contenido: el contenido se desplaza con el dedo sin cerrar la hoja por accidente. El gesto es un atajo; el botón de cierre siempre existe (WCAG 2.5.7).
- La altura máxima es el 90 % de la ventana y el interior hace scroll propio.
- El foco visible no queda oculto bajo la hoja.

## Objetivos táctiles

- Con puntero grueso (`@media (pointer: coarse)`), todo control interactivo mide al menos 44 × 44 px, incluidos los botones de cierre, las pestañas y los enlaces de las gráficas.
- El color nunca es la única señal, tampoco en el mapa: los estados llevan texto en filtros y leyendas, como marca `16-accesibilidad.md`.

## Pestañas

- Una fila de pestañas hace scroll horizontal (`overflow-x: auto`, `scroll-snap-type: x proximity`) en vez de envolverse: no roba altura al contenido.
- La pestaña activa entra en la vista al cambiar (`scrollIntoView({ inline: 'nearest' })`) y se recorre con las flechas del teclado, según el patrón `aria-tabs` de WAI-ARIA.
- Un degradado en el borde señala que hay más pestañas a la derecha.

## Gráficas

- El contenedor de cada gráfica tiene altura fluida por CSS; ECharts ya se redimensiona con su `ResizeObserver`.
- Los márgenes de la cuadrícula se reducen en pantallas estrechas para no comerse el trazado; el eje derecho se conserva porque distingue fluidos.
- El zoom de datos muestra un control deslizante visible en pantallas táctiles: el gesto de pellizco funciona, pero no basta como única señal.
- La vista de tabla de cada gráfica es el respaldo de lectura en pantallas pequeñas: siempre con los mismos datos.

## Tablas y páginas

- Toda tabla ancha vive en un envoltorio con `overflow-x: auto`.
- Las páginas de texto (legales, fuentes) limitan el ancho de línea con `max-width` y añaden relleno lateral en el teléfono.

## Pruebas

- `pnpm test:e2e` incluye un proyecto con `devices['Pixel 7']` que recorre el mapa: abrir filtros, cerrar, seleccionar un pozo, mover las pestañas y recargar.
- axe se ejecuta también en el proyecto móvil sobre el mapa y la ficha.
- Toda vista nueva se comprueba a 360 px de ancho antes de darse por terminada.
