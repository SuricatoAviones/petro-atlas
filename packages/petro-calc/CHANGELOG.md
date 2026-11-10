# Changelog

Todas las versiones notables de `@petroatlas/petro-calc`. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado, [SemVer](https://semver.org/lang/es/).

## [0.1.0] - 2026-11-10

Primera versión preparada para publicación.

### Añadido

- `units`: constantes y conversiones entre SI y unidades de campo.
- `diagnostics`: corte de agua, RGP, RAP, índice de productividad y diagnóstico de Chan.
- `dca`: ajuste de la declinación de Arps, pronóstico, acumulado y EUR.
- `ipr`: Vogel, Fetkovich y la curva compuesta.
- `pvt`: Standing, Vasquez-Beggs y Beggs-Robinson.
- Pruebas contra valores publicados y umbral de cobertura del 90 %.

### Notas

- Paquete ESM sin dependencias, con tipos incluidos.
- Las correlaciones PVT usan unidades de campo (psia, °F, scf/STB y cP).
