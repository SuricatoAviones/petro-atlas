# Accesibilidad

La web se comprueba con axe en las pruebas de extremo a extremo. axe no sustituye una revisión manual: esta página recoge lo que se ha revisado y lo que queda por comprobar antes de una explotación pública.

## Comprobado automáticamente

`apps/web/e2e/accessibility.spec.ts` ejecuta axe sobre:

- el mapa y la ficha de un pozo;
- las páginas legales;
- la versión inglesa de las páginas legales.

```bash
pnpm test:e2e
```

Las pruebas fallan si aparece una violación nueva.

## Checklist de revisión manual

| Área | Comprobación | Estado |
| --- | --- | --- |
| Teclado | Tab recorre cabecera, filtros, mapa, ficha, pestañas y enlaces del pie | Pendiente |
| Teclado | El botón de cerrar la ficha se puede activar con Intro y Espacio | Pendiente |
| Teclado | Las tablas de las gráficas se pueden recorrer con las flechas | Pendiente |
| Foco | El foco visible usa el color de acento y no se oculta bajo el mapa | Pendiente |
| Idioma | El selector `lang` cambia con la ruta `/es` o `/en` | Pendiente |
| Contraste | Texto normal y textos de ayuda sobre fondo claro | Pendiente |
| Color | Estados y alertas no dependen solo del color: llevan texto | Pendiente |
| Formularios | Filtros, importación CSV y LAS tienen etiqueta asociada | Pendiente |
| Errores | Los errores usan `role="alert"` o `aria-live` | Pendiente |
| Gráficas | Cada gráfica tiene nombre accesible y vista de tabla | Pendiente |
| Movimiento | Las animaciones de las gráficas están desactivadas | Pendiente |

## Pendiente de una revisión manual externa

- Probar con **NVDA o JAWS** en Windows y con **VoiceOver** en macOS.
- Revisar el orden de lectura y los anuncios del mapa con lector de pantalla; MapLibre dibuja en canvas y la información principal debe seguir disponible en la ficha.
- Revisar el zoom al 200 % y al 400 %.
- Revisar en móvil real con TalkBack y VoiceOver.
- Revisar el contraste de los colores de las series con una herramienta de contraste, no solo a ojo.
- Revisar la importación de un CSV grande: el resumen y la tabla de errores deben seguir siendo anunciados sin bloquear el navegador.

## Reglas para cambios futuros

- Un control nuevo lleva etiqueta visible o `aria-label` cuando el texto no basta.
- Un estado de carga usa `role="status"`; un error, `role="alert"`.
- Un gráfico nuevo lleva `role="img"`, nombre accesible y vista de tabla con los mismos datos.
- Un estado no se comunica solo con color.
- Si se añade una animación, se respeta `prefers-reduced-motion`.
- Las pruebas de axe se actualizan con la pantalla nueva.
