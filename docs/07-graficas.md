# Catálogo de gráficas

Las gráficas son el núcleo de la ficha del pozo. Se agrupan en pestañas y comparten el eje de tiempo: un zoom en una se aplica a las demás.

## Catálogo

| Pestaña | Gráfica | Variables | Qué evalúa el ingeniero | Origen |
| --- | --- | --- | --- | --- |
| Producción | Historial de tasas | qo, qg, qw vs tiempo (eje lineal o log) | Tendencia, paradas y cambios de régimen | Medido |
| Producción | Corte de agua y RGP | fw (%), RGP vs tiempo | Irrupción de agua o gas | Calculado |
| Producción | Acumulados | Np, Gp, Wp vs tiempo | Volumen recuperado | Calculado |
| Producción | Inyección | Tasa de agua inyectada vs tiempo | Soporte de presión en pozos inyectores | Medido |
| Operación | Presiones | Presión de fondo y de cabezal vs tiempo | Agotamiento y problemas de levantamiento | Medido |
| Operación | Temperaturas | Temperatura de fondo y de cabezal vs tiempo | Cambios de fluido y de caudal | Medido |
| Operación | Choke | Apertura (%) vs tiempo | Relación entre ajustes operativos y tasa | Medido |
| Operación | Horas en línea | Horas de flujo por día | Disponibilidad del pozo | Medido |
| Diagnóstico | Chan | RAP y su derivada vs tiempo, log-log | Conificación frente a canalización | Calculado |
| Diagnóstico | Tasa vs acumulado | qo vs Np | Reservas remanentes por extrapolación | Calculado |
| Diagnóstico | Índice de productividad | J vs tiempo | Daño o pérdida de productividad | Calculado, requiere presión de yacimiento |
| Ingeniería | Declinación de Arps | qo vs tiempo, semilog, con ajuste y pronóstico | EUR y vida remanente | Calculado |
| Ingeniería | IPR | Pwf vs q | Potencial del pozo y punto de operación | Calculado |
| Ingeniería | PVT | Bo, Rs, viscosidad vs presión | Propiedades del fluido para los demás cálculos | Calculado |
| Pozo | Trayectoria | Profundidad vertical vs desplazamiento | Geometría del pozo | Medido |
| Pozo | Registros | Rayos gamma, resistividad, densidad y neutrón vs profundidad | Litología y zonas productoras | Medido |
| Campo | Producción apilada | Tasa por pozo, área apilada | Aporte de cada pozo al campo | Medido |
| Campo | Mapa de burbujas | Acumulado por pozo sobre el mapa | Distribución areal del drenaje | Calculado |

## Disponibilidad

Las series de presión, temperatura y choke existen en el seed sintético y en los pozos importados que las traigan. Para el resto, la pestaña Operación aparece deshabilitada con una nota que lo explica. Nunca se muestra una gráfica vacía sin explicación.

## Archivos LAS locales

La pestaña Registros permite abrir un archivo LAS 2.0 desde el navegador. El archivo no se sube a la API ni se guarda en IndexedDB: sus curvas se dibujan con el mismo visor por pistas y desaparecen al cambiar de pozo o al cerrar la pestaña.

- La primera curva debe ser de profundidad (`DEPT`, `DEPTH`, `MD` o `TVD`).
- Se respetan los valores nulos de la cabecera `NULL` y los huecos se dibujan como cortes.
- Si la profundidad viene en pies, se convierte a metros para el eje.
- Los archivos con `WRAP. YES` no son compatibles.

## Reglas de comportamiento

1. **Eje de tiempo compartido.** Todas las gráficas de una ficha están enlazadas: zoom, desplazamiento y cursor se sincronizan.
2. **Huecos.** Un `null` corta la línea. No se interpola ni se dibuja como cero.
3. **Días cerrados.** Los días con `on_stream_h = 0` se sombrean en gris en todas las gráficas de tiempo.
4. **Unidades.** Un selector global alterna SI y unidades de campo en Producción, Operación y Trayectoria. La conversión se hace al dibujar, con `petro-calc/units`; los datos en memoria siguen en SI. Ingeniería y Diagnóstico muestran sus propias unidades fijas (bar, Sm³/d, psia, °F, scf/STB), porque las correlaciones empíricas se publicaron en esas unidades.
5. **Ejes.** La tasa admite eje lineal o logarítmico. Chan es siempre log-log. La declinación es semilog por defecto.
6. **Colores fijos por fluido.** Petróleo verde, gas rojo, agua azul, inyección azul oscuro. No cambian entre gráficas. Las presiones y temperaturas usan otra familia de colores para no confundirse con fluidos.
7. **Fuente visible.** Cada gráfica lleva al pie la fuente y la licencia del dato.
8. **Vista de tabla.** Cada gráfica tiene un botón que muestra los mismos datos en tabla, para accesibilidad y para copiar valores.
9. **Series largas.** Por encima de unos 5.000 puntos se aplica reducción con LTTB solo para dibujar. Los cálculos usan siempre la serie completa.
10. **Selección de ventana.** Arrastrar sobre la gráfica de tasa define la ventana de ajuste de la declinación. La ventana queda reflejada en la URL.
11. **Comparación.** Al comparar pozos, cada pozo usa un estilo de línea distinto y el color sigue indicando el fluido.
12. **Exportación.** Cada gráfica exporta PNG y los datos visibles en CSV.

## Mapa de burbujas

- El radio de la burbuja es proporcional a la raíz cuadrada del acumulado, para que el área represente el volumen.
- Un selector elige el fluido: petróleo, gas o agua.
- Una leyenda muestra tres tamaños de referencia con su valor.
