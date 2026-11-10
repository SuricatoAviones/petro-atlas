# Datos de ejemplo

PetroAtlas usa **datos sintéticos de Venezuela** para la demo pública. No proceden de Sodir, Volve ni Diskos, y no representan ningún yacimiento, operadora o pozo real.

## Por qué datos sintéticos

Se revisaron las fuentes públicas venezolanas disponibles: portales de datos abiertos, publicaciones del ministerio y de PDVSA, y conjuntos internacionales de campos petroleros. No se encontró un conjunto abierto con **producción diaria por pozo, presiones y trayectorias** y una licencia que permita redistribuirlo. Por eso el proyecto no carga datos de terceros y usa un conjunto ficticio.

El repositorio no incluye datos de terceros. Cualquier dato que se añada en el futuro debe documentar su licencia y su atribución en esta página y en `/fuentes`.

## Conjunto incluido

`db/seed/generate.ts` genera de forma determinista:

| Elemento | Contenido |
| --- | --- |
| Campo | `CAMPO ESCUELA VENEZUELA`, en una zona ficticia del este de Venezuela |
| Pozos | `VE-01` a `VE-20`: productores, inyectores, un abandonado y uno de observación |
| Producción | Un año de datos diarios: petróleo, gas, agua, inyección, presiones, temperatura, choke y horas en línea |
| Trayectorias | Estaciones sintéticas para todos los pozos |
| Registros | Curvas GR, NPHI, RHOB y RT en parte de los pozos, con un hueco de densidad |
| Serie mensual | Producción mensual del campo para la ficha del campo |

Todo lleva la fuente `PetroAtlas Venezuela synthetic seed` y la licencia MIT del repositorio, con la nota de que son datos generados y no mediciones reales.

## Reglas

1. **Nada de datos reales en Git.** El seed no descarga archivos ni usa servicios externos.
2. **Determinista.** La misma versión del generador produce siempre el mismo conjunto.
3. **Idempotente.** `pnpm db:seed` se puede ejecutar varias veces sin duplicar filas.
4. **Sin ceros inventados.** Un dato ausente es `null`, nunca `0`.
5. **Unidades SI.** Volúmenes en Sm³, presiones en bar, temperaturas en °C y profundidades en m.
6. **Atribución visible.** La fuente sintética aparece al pie de las gráficas y en `/fuentes`.

## Comandos

```bash
pnpm db:migrate   # aplica el esquema y retira los conjuntos antiguos
pnpm db:seed      # carga CAMPO ESCUELA VENEZUELA
```

La migración `0006_remove_norway_sources.sql` elimina de bases existentes los datos de Sodir, Volve y el antiguo campo sintético noruego. En una instalación nueva no hay nada que borrar.

## Preguntas cerradas

- No se usan datos de Sodir ni de Volve.
- No se incluye Diskos.
- No hay ETL de datos públicos en este repositorio.
