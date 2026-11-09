# Visión y alcance

## Visión

Una sola aplicación web donde un ingeniero abre un mapa, elige un pozo y, sin cambiar de herramienta, ve su historial de producción y presión y corre los cálculos habituales de ingeniería sobre esos mismos datos.

Lo que existe hoy en código abierto resuelve cada parte por separado: tableros de producción sin mapa, visores de mapa sin series y librerías de cálculo sin interfaz. PetroAtlas las une.

## Usuarios

| Usuario | Qué busca |
| --- | --- |
| Ingeniero de producción o yacimientos | Revisar el comportamiento de un pozo y estimar declinación, potencial y propiedades del fluido |
| Estudiante o docente | Practicar con datos reales de un campo |
| Reclutador o evaluador técnico | Entender en minutos qué sabe hacer el autor |
| Mantenedor | Cargar y actualizar los datos públicos |

## Alcance

El sistema es de solo lectura para el visitante: explora, grafica, calcula y exporta. Los datos públicos entran únicamente por el proceso de ingesta. El visitante puede además importar sus propios pozos desde CSV, que se guardan solo en su navegador.

Fuera de alcance:

- Autenticación y cuentas de usuario.
- Datos en tiempo real o conexión a SCADA.
- Simulación de yacimientos, análisis nodal completo y transitorios de presión.
- Edición de los datos públicos desde la interfaz.

## Requisitos funcionales

| ID | Requisito | Fase |
| --- | --- | --- |
| RF-01 | Mapa de pozos con clustering, color por estado o tipo y capas de campos e instalaciones | 1 |
| RF-02 | Filtros por campo, operadora, tipo, estado y año de perforación | 1 |
| RF-03 | Ficha del pozo con metadatos, ubicación y trayectoria | 1 |
| RF-04 | Gráficas de producción: tasas de petróleo, gas y agua, corte de agua y RGP | 2 |
| RF-05 | Gráficas de operación: presión de fondo y de cabezal, temperatura, choke y horas en línea | 2 |
| RF-06 | Mapa de burbujas de producción acumulada por pozo o campo | 2 |
| RF-07 | Ajuste de declinación de Arps con pronóstico y EUR | 3 |
| RF-08 | Curvas IPR y correlaciones PVT con parámetros editables | 3 |
| RF-09 | Gráficos de diagnóstico: Chan e índice de productividad en el tiempo | 3 |
| RF-10 | Comparación de dos o más pozos en una misma gráfica | 4 |
| RF-11 | Visor de registros de pozo (LAS) por pistas | 4 |
| RF-12 | Exportación de series y resultados a CSV | 4 |
| RF-13 | Alertas automáticas por pozo, visibles en el mapa, en la ficha y en un panel ordenado por gravedad | 2 |
| RF-14 | Importación CSV de pozos y producción propios, validada y guardada en el navegador | 4 |
| RF-15 | Estado de la vista en la URL: filtros, pozo abierto, rango de fechas y pestaña | 1 |

## Requisitos no funcionales

| ID | Requisito | Cómo se verifica |
| --- | --- | --- |
| RNF-01 Rendimiento | El mapa responde con fluidez con 10.000 pozos; las series se sirven agregadas según el rango visible | Prueba de carga con datos de Sodir; la ficha de un pozo abre en menos de 1 s en local |
| RNF-02 Trazabilidad | Cada registro guarda su fuente y fecha de ingesta; cada gráfica muestra de dónde vienen sus datos | Columna `source_id` y pie de fuente en cada gráfica |
| RNF-03 Unidades | Almacenamiento en SI; la interfaz alterna entre SI y unidades de campo (bbl, psi, °F) | Pruebas de conversión en `petro-calc/units` |
| RNF-04 Calidad | El paquete de cálculos tiene pruebas unitarias contra casos publicados | Cobertura de 90% o más en `petro-calc` |
| RNF-05 Despliegue | Un solo `docker compose up` levanta base de datos, API y web con datos de ejemplo | Paso del CI |
| RNF-06 Accesibilidad | Navegable por teclado, contraste AA, cada gráfica con vista de tabla alternativa | Revisión con axe en las pruebas de extremo a extremo |
| RNF-07 Licencias | El repositorio no redistribuye datos de terceros; el ETL los descarga | Revisión del PR; `.gitignore` de `data/` |

## Glosario

| Término | Significado |
| --- | --- |
| BHP | Presión de fondo fluyente (bottomhole pressure) |
| WHP | Presión de cabezal (wellhead pressure) |
| RGP / GOR | Relación gas-petróleo |
| RAP / WOR | Relación agua-petróleo |
| Corte de agua | Fracción de agua en el líquido producido |
| DCA | Análisis de curvas de declinación |
| EUR | Recuperación final estimada |
| IPR | Relación de comportamiento de afluencia: presión de fondo frente a caudal |
| PVT | Propiedades del fluido en función de presión, volumen y temperatura |
| Pb | Presión de burbuja |
| MD / TVD | Profundidad medida y profundidad vertical verdadera |
| LAS | Formato de texto para registros de pozo |
| Sm³ | Metro cúbico estándar |
