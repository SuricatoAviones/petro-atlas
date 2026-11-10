# `@suricatoaviones/petro-calc`

Cálculos de ingeniería de petróleo en TypeScript puro, sin dependencias. Se ejecuta igual en el navegador, en Node o en un worker, y no conoce la interfaz ni la base de datos.

> **Estado:** versión `0.2.0` preparada para publicarse como `@suricatoaviones/petro-calc`.

## Instalación

```bash
pnpm add @suricatoaviones/petro-calc
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
| `alerts`      | Alertas de caída de producción, corte de agua alto y pozo sin producir. |

Todo se importa desde la raíz del paquete:

```ts
import { fitArps, forecast, eur, vogel, standing, chan } from '@suricatoaviones/petro-calc';
```

## Ejemplos

### Declinación de Arps

```ts
import { eur, fitArps, forecast } from '@suricatoaviones/petro-calc';

const days = [0, 30, 60, 90, 120, 150];
const oilSm3PerDay = [1000, 970, 941, 913, 886, 860];

const fit = fitArps(days, oilSm3PerDay); // modelo automático, b entre 0 y 1
const nextYear = forecast(fit, 365);
const recovery = eur(fit, 5, 120_000); // tasa límite 5 Sm3/d
```

`fitArps` ignora los días cerrados o con tasa nula y necesita al menos seis puntos positivos.

### IPR

```ts
import { composite, fetkovich, vogel } from '@suricatoaviones/petro-calc';

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
import { standing, vasquezBeggs } from '@suricatoaviones/petro-calc';

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
import { chan, productivityIndex } from '@suricatoaviones/petro-calc';

const diagnostic = chan(waterSm3PerDay, oilSm3PerDay); // RAP y su derivada
const j = productivityIndex(50, 250, 180); // Sm3/d/bar
```

### Alertas

Las reglas miran hacia atrás desde la última fecha de la serie, no desde hoy.

```ts
import { defaultThresholds, evaluate } from '@suricatoaviones/petro-calc';

const alerts = evaluate({
  dates, // fechas ISO, una por muestra
  oil: oilSm3PerDay,
  gas: gasSm3PerDay,
  water: waterSm3PerDay,
});
// [{ kind: 'production_drop', level: 'critical', asOf: '2026-10-22', value: 41.2 }]

const stricter = evaluate(series, { ...defaultThresholds, dropWarningFraction: 0.1 });
```

## Convenciones

- Los volúmenes y caudales de las series están en SI; la unidad acompaña al nombre (`oilSm3`, `bhpBar`).
- Un dato ausente es `null`, nunca `0`.
- Las correlaciones empíricas conservan las unidades de su publicación original y lo indican en la firma.
- Las funciones validan sus entradas y lanzan un error explicado cuando la combinación no es evaluable.

## Desarrollo

```bash
pnpm install
pnpm --filter @suricatoaviones/petro-calc typecheck
pnpm test --project petro-calc
pnpm --filter @suricatoaviones/petro-calc build
```

## Licencia

MIT.
