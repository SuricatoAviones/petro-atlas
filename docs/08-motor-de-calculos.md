# Motor de cálculos: `petro-calc`

Los cálculos viven en un paquete TypeScript independiente, sin dependencias de la interfaz ni de la base de datos. Se ejecuta en el navegador, así que mover un parámetro redibuja la curva al instante, y puede publicarse en npm por separado.

## Módulos

| Módulo | Funciones | Entrada | Salida |
| --- | --- | --- | --- |
| `dca` | `fitArps`, `rateAt`, `cumulativeAt`, `forecast`, `eur` | Serie de tasa vs tiempo, tasa límite económica | qi, Di, b, R², pronóstico, EUR |
| `ipr` | `vogel`, `fetkovich`, `composite` | Presión de yacimiento, punto de prueba | Curva Pwf vs q, caudal máximo |
| `pvt` | `standing`, `vasquezBeggs`, `beggsRobinson` | API, gravedad del gas, temperatura, presión | Pb, Rs, Bo, viscosidad |
| `diagnostics` | `waterCut`, `gor`, `chan`, `productivityIndex` | Series de producción y presión | Series derivadas |
| `alerts` | `evaluate`, `defaultThresholds` | Series de producción y umbrales | Alertas con nivel |
| `units` | `convert`, `toField`, `toSI` | Valor y unidad | Valor convertido |

## Reglas del paquete

- Funciones puras: misma entrada, misma salida, sin estado global ni acceso a red o disco.
- Sin dependencias en tiempo de ejecución, o las mínimas y justificadas en un ADR.
- Cada función declara en su documentación las unidades que espera y las que devuelve.
- Las correlaciones empíricas trabajan internamente en unidades de campo, que es como están publicadas. La conversión desde y hacia SI se hace en el borde de la función.
- Entradas fuera del rango de validez de una correlación devuelven un resultado con una advertencia, no una excepción silenciosa ni un número sin aviso.
- Cada fórmula cita su referencia en un comentario y tiene al menos una prueba contra un valor publicado.

## Firmas

```ts
// dca
export interface ArpsFit {
  model: ArpsModel;      // 'exponential' | 'hyperbolic' | 'harmonic'
  qi: number;            // tasa inicial en t = 0 de la ventana
  di: number;            // declinación nominal inicial, 1/día
  b: number;             // 0 exponencial, 1 armónica
  r2: number;
  n: number;             // puntos usados
}
export function fitArps(
  t: number[],           // días desde el inicio de la ventana
  q: number[],           // tasa, misma unidad que se quiera de vuelta
  opts?: { model?: ArpsModel | 'auto'; bMax?: number }
): ArpsFit;
export function rateAt(fit: ArpsFit, t: number): number;
export function cumulativeAt(fit: ArpsFit, t: number): number;
export function forecast(fit: ArpsFit, days: number, step?: number): { t: number[]; q: number[] };
export function eur(fit: ArpsFit, qLimit: number, cumulativeToWindowStart: number): number;

// ipr
export function vogel(pr: number, test: { pwf: number; q: number }): { qmax: number; curve: Point[] };
export function fetkovich(pr: number, tests: { pwf: number; q: number }[]): { c: number; n: number; curve: Point[] };
export function composite(pr: number, pb: number, j: number): { qb: number; qmax: number; curve: Point[] };

// alerts
export function evaluate(series: ProductionSeries, thresholds?: Thresholds): Alert[];
```

## Fórmulas

### Declinación de Arps

Hiperbólica, con 0 < b < 1:

```math
q(t) = \frac{q_i}{\left(1 + b\,D_i\,t\right)^{1/b}}
\qquad
N_p(t) = \frac{q_i^{\,b}}{(1-b)\,D_i}\left(q_i^{\,1-b} - q(t)^{\,1-b}\right)
```

Exponencial, b = 0:

```math
q(t) = q_i\,e^{-D_i t}
\qquad
N_p(t) = \frac{q_i - q(t)}{D_i}
```

Armónica, b = 1:

```math
q(t) = \frac{q_i}{1 + D_i\,t}
\qquad
N_p(t) = \frac{q_i}{D_i}\,\ln\frac{q_i}{q(t)}
```

Recuperación final estimada hasta la tasa límite económica, sumando el acumulado hasta el inicio de la ventana:

```math
EUR = N_{p,0} + N_p\left(t \mid q = q_{lim}\right)
```

**Ajuste.** Mínimos cuadrados no lineales (Levenberg-Marquardt) sobre el logaritmo de la tasa. Con `model: 'auto'` se ajusta el modelo hiperbólico con b limitado a [0, `bMax`], con `bMax` igual a 1 por defecto. Los días con el pozo cerrado y las tasas nulas se excluyen antes de ajustar. Se necesitan al menos 6 puntos; con menos, la función devuelve un error explicado.

### IPR

Vogel, para yacimientos por debajo del punto de burbuja:

```math
\frac{q_o}{q_{o,max}} = 1 - 0.2\,\frac{P_{wf}}{P_r} - 0.8\left(\frac{P_{wf}}{P_r}\right)^{2}
```

Fetkovich:

```math
q_o = C\left(P_r^{2} - P_{wf}^{2}\right)^{n}
```

Compuesta, con comportamiento lineal por encima de Pb y de Vogel por debajo:

```math
q_o =
\begin{cases}
J\,(P_r - P_{wf}) & P_{wf} \ge P_b \\[4pt]
q_b + \dfrac{J\,P_b}{1.8}\left[1 - 0.2\,\dfrac{P_{wf}}{P_b} - 0.8\left(\dfrac{P_{wf}}{P_b}\right)^{2}\right] & P_{wf} < P_b
\end{cases}
\qquad q_b = J\,(P_r - P_b)
```

### PVT

Standing, con Rs en scf/STB, T en °F y presiones en psia.

Presión de burbuja:

```math
P_b = 18.2\left[\left(\frac{R_s}{\gamma_g}\right)^{0.83} 10^{\,0.00091\,T - 0.0125\,API} - 1.4\right]
```

Gas en solución:

```math
R_s = \gamma_g\left[\left(\frac{P}{18.2} + 1.4\right) 10^{\,0.0125\,API - 0.00091\,T}\right]^{1.2048}
```

Factor volumétrico del petróleo en el punto de burbuja:

```math
B_o = 0.9759 + 0.00012\left[R_s\left(\frac{\gamma_g}{\gamma_o}\right)^{0.5} + 1.25\,T\right]^{1.2}
```

Viscosidad de Beggs y Robinson, con T en °F y viscosidad en cP. Petróleo muerto:

```math
\mu_{od} = 10^{X} - 1, \qquad X = y\,T^{-1.163}, \qquad y = 10^{\,3.0324 - 0.02023\,API}
```

Petróleo saturado:

```math
\mu_o = A\,\mu_{od}^{\,B}, \qquad A = 10.715\,(R_s + 100)^{-0.515}, \qquad B = 5.44\,(R_s + 150)^{-0.338}
```

**Vasquez y Beggs.** Usa coeficientes distintos según la gravedad API sea mayor o menor que 30. Esos coeficientes no se transcriben aquí: se toman de la publicación original o de un texto de referencia al implementar, se citan en el código y se validan con un ejemplo publicado.

### Diagnóstico

```math
f_w = \frac{q_w}{q_o + q_w}
\qquad
RGP = \frac{q_g}{q_o}
\qquad
RAP = \frac{q_w}{q_o}
\qquad
RAP' = \frac{d(RAP)}{dt}
\qquad
J = \frac{q}{P_r - P_{wf}}
```

La derivada de Chan se calcula sobre la serie suavizada con una ventana móvil, porque la derivada punto a punto de datos diarios es demasiado ruidosa para leerse.

## Conversiones

| De | A | Factor |
| --- | --- | --- |
| Sm³ de líquido | bbl | × 6,2898 |
| Sm³ de gas | scf | × 35,3147 |
| Sm³/Sm³ (RGP) | scf/STB | × 5,6146 |
| bar | psi | × 14,5038 |
| °C | °F | × 9/5 + 32 |
| m | ft | × 3,28084 |

## Validación

Las fórmulas de este documento se escribieron de memoria a partir de la literatura estándar. Antes de dar por buena cada una, se contrasta con la fuente y se añade una prueba.

| Módulo | Caso de prueba mínimo |
| --- | --- |
| `dca` | Recuperar qi, Di y b de una serie sintética generada con parámetros conocidos, con y sin ruido |
| `dca` | Un ejemplo resuelto de un libro de texto de ingeniería de yacimientos |
| `ipr` | Ejemplo resuelto de Vogel: dado un punto de prueba, comprobar qmax y dos puntos de la curva |
| `pvt` | Ejemplo resuelto de Standing para Pb y Bo |
| `pvt` | Ejemplo resuelto de Beggs y Robinson para viscosidad |
| `diagnostics` | Serie pequeña calculada a mano |
| `alerts` | Un caso por regla y por nivel, y un caso sin alerta |
| `units` | Ida y vuelta: convertir y desconvertir devuelve el valor original |

Referencias sugeridas: Ahmed, *Reservoir Engineering Handbook*; Brown y Beggs, *The Technology of Artificial Lift Methods*; Arps (1945), *Analysis of Decline Curves*.
