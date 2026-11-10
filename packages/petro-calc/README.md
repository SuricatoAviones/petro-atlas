# `@petroatlas/petro-calc`

Cálculos de ingeniería de petróleo en TypeScript puro, sin dependencias. Se ejecuta igual en el navegador, en Node o en un worker, y no conoce la interfaz ni la base de datos.

> **Estado:** versión `0.1.0` preparada. La publicación en npm está pendiente de confirmar el ámbito `@petroatlas` y de autenticar la cuenta que publica; hasta entonces, el paquete se consume desde el monorepo.

## Instalación

```bash
pnpm add @petroatlas/petro-calc
```

El paquete es un módulo ESM con tipos incluidos.

## Módulos

| Módulo        | Contenido                                                               |
| ------------- | ----------------------------------------------------------------------- |
| `units`       | Constantes y conversiones entre SI y unidades de campo.                 |
| `diagnostics` | Corte de agua, RGP, RAP, índice de productividad y diagnóstico de Chan. |
| `dca`         | Ajuste de declinación de Arps, pronóstico, acumulado y EUR.             |
| `ipr`         | Vogel, Fetkovich y la curva compuesta.                                  |
| `pvt`         | Standing, Vasquez-Beggs y Beggs-Robinson.                               |

Todo se importa desde la raíz del paquete:

```ts
import { fitArps, forecast, eur, vogel, standing, chan } from '@petroatlas/petro-calc';
```

## Ejemplos

### Declinación de Arps

```ts
import { eur, fitArps, forecast } from '@petroatlas/petro-calc';

const days = [0, 30, 60, 90, 120, 150];
const oilSm3PerDay = [1000, 970, 941, 913, 886, 860];

const fit = fitArps(days, oilSm3PerDay); // modelo automático, b entre 0 y 1
const nextYear = forecast(fit, 365);
const recovery = eur(fit, 5, 120_000); // tasa límite 5 Sm3/d
```

`fitArps` ignora los días cerrados o con tasa nula y necesita al menos seis puntos positivos.

### IPR

```ts
import { composite, fetkovich, vogel } from '@petroatlas/petro-calc';

const fromOneTest = vogel(250, { pwf: 180, q: 50 }); // bar y Sm3/d
const fromTwoTests = fetkovich(250, [
  { pwf: 180, q: 50 },
  { pwf: 120, q: 80 },
]);
const withBubblePoint = composite(250, 150, 0.5); // Pr, Pb y J
```

### PVT

Las correlaciones PVT usan unidades de campo: psia, °F, scf/STB y cP.

```ts
import { standing, vasquezBeggs } from '@petroatlas/petro-calc';

const input = {
  api: 35,
  gasGravity: 0.75,
  temperatureF: 200,
  solutionGasScfStb: 600,
};

const standingResult = standing(input);
const vasquezResult = vasquezBeggs(input);
```

### Diagnóstico

```ts
import { chan, productivityIndex } from '@petroatlas/petro-calc';

const diagnostic = chan(waterSm3PerDay, oilSm3PerDay); // RAP y su derivada
const j = productivityIndex(50, 250, 180); // Sm3/d/bar
```

## Convenciones

- Los volúmenes y caudales de las series están en SI; la unidad acompaña al nombre (`oilSm3`, `bhpBar`).
- Un dato ausente es `null`, nunca `0`.
- Las correlaciones empíricas conservan las unidades de su publicación original y lo indican en la firma.
- Las funciones validan sus entradas y lanzan un error explicado cuando la combinación no es evaluable.

## Desarrollo

```bash
pnpm install
pnpm --filter @petroatlas/petro-calc typecheck
pnpm test --project petro-calc
pnpm --filter @petroatlas/petro-calc build
```

## Licencia

MIT.
