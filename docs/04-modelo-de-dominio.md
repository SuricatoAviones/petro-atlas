# Modelo de dominio

El pozo es el agregado central; los cálculos dependen solo de sus series.

```mermaid
classDiagram
  class Field {
    +number id
    +string name
    +string operator
    +FieldStatus status
    +MultiPolygon geometry
    +production(range) Series
  }
  class Well {
    +number id
    +string name
    +WellType type
    +WellStatus status
    +Point location
    +Date spudDate
    +number totalDepth
    +series(range) Series
    +trajectory() TrajectoryStation[]
  }
  class ProductionRecord {
    +Date date
    +number oilRate
    +number gasRate
    +number waterRate
    +number bottomholePressure
    +number wellheadPressure
    +number bottomholeTemp
    +number chokePct
    +number onStreamHours
    +waterCut() number
    +gor() number
  }
  class TrajectoryStation {
    +number md
    +number tvd
    +number inclination
    +number azimuth
  }
  class LogCurve {
    +string mnemonic
    +string unit
    +number[] depth
    +number[] values
  }
  class DeclineFit {
    +ArpsModel model
    +number qi
    +number di
    +number b
    +number r2
    +rateAt(t) number
    +eur(qLimit) number
  }
  class Alert {
    +AlertKind kind
    +AlertLevel level
    +Date asOf
    +string message
  }

  Field "1" o-- "*" Well
  Well "1" *-- "*" ProductionRecord
  Well "1" *-- "*" TrajectoryStation
  Well "1" *-- "*" LogCurve
  DeclineFit ..> ProductionRecord : usa
  Alert ..> ProductionRecord : usa
  Alert --> Well
```

Rombo relleno: composición. Rombo vacío: agregación. Flecha punteada: dependencia.

## Qué se persiste y qué no

| Clase | Dónde vive | Nota |
| --- | --- | --- |
| `Field`, `Well`, `ProductionRecord`, `TrajectoryStation`, `LogCurve` | PostgreSQL | Cargadas por el seed sintético |
| `Alert` de pozos públicos | Vista `well_alert` | Se calcula al consultar |
| `Alert` de pozos importados | Memoria del navegador | La calcula `petro-calc/alerts` |
| `DeclineFit`, curvas IPR y PVT | Memoria del navegador | Se construyen a partir de una serie y viven mientras dura la sesión |
| Pozos importados | IndexedDB | Nunca se envían al servidor |

## Enumeraciones

```ts
export type WellType = 'producer' | 'injector' | 'exploration' | 'observation';
export type WellStatus = 'producing' | 'injecting' | 'shut_in' | 'abandoned' | 'unknown';
export type FieldStatus = 'producing' | 'shut_down' | 'approved' | 'unknown';
export type ArpsModel = 'exponential' | 'hyperbolic' | 'harmonic';
export type AlertKind = 'production_drop' | 'high_water_cut' | 'no_production';
export type AlertLevel = 'warning' | 'critical';
```

Los valores de estado se asignan en el seed. El valor original se conserva en una columna de texto aparte si hace falta para depurar.

## Tipos compartidos

Los tipos anteriores y los esquemas Zod que validan las respuestas de la API viven en `packages/shared-types`. La web y la API importan el mismo esquema, de modo que un cambio en la forma de una respuesta rompe la compilación en ambos lados.
