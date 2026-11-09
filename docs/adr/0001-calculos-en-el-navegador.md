# 0001 — Los cálculos de ingeniería corren en el navegador

- **Estado:** Aceptada
- **Fecha:** 2026-11-09

## Contexto

Las herramientas de ingeniería (declinación, IPR, PVT, diagnóstico) son interactivas: el usuario mueve un parámetro o una ventana y espera ver la curva cambiar. Los cálculos son ligeros y operan sobre series de unos miles de puntos.

## Decisión

Implementar los cálculos en un paquete TypeScript puro, `petro-calc`, que se ejecuta en el navegador. La API solo sirve datos.

## Alternativas descartadas

- **Calcular en la API:** cada ajuste costaría una petición, con latencia visible al arrastrar, y obligaría a mantener rutas de cálculo y su validación.
- **Servicio de cálculo en Python:** daría acceso a SciPy, pero añade un segundo lenguaje y un servicio más que desplegar para cálculos que no lo necesitan.

## Consecuencias

- Respuesta inmediata y una API más simple, de solo lectura.
- El mismo paquete sirve para los pozos importados, que nunca llegan al servidor.
- `petro-calc` se puede publicar en npm como entregable independiente.
- El ajuste no lineal hay que implementarlo o traerlo de una librería pequeña, y probarlo bien.
- Si en el futuro aparece un cálculo pesado, se evalúa un Web Worker antes que moverlo al servidor.
