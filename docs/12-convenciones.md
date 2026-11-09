# Convenciones

Reglas que sigue todo cambio en el repositorio, lo escriba una persona o un agente de IA.

## Idioma

| Qué | Idioma |
| --- | --- |
| Código, identificadores, nombres de archivo, comentarios | Inglés |
| Mensajes de commit y títulos de PR | Inglés |
| Documentación en `docs/` | Español |
| Textos de la interfaz | Español, centralizados en archivos de mensajes para poder traducirlos |

## TypeScript

- `strict: true` en todos los paquetes. Sin `any`; si hace falta, `unknown` y una comprobación.
- Sin `// @ts-ignore`. Si es inevitable, `// @ts-expect-error` con el motivo.
- Los datos que cruzan un borde (respuesta de la API, archivo CSV, parámetros de URL, fila de la base de datos) se validan con Zod. Dentro del sistema se confía en los tipos.
- Funciones pequeñas y con nombre que diga qué hacen. Sin abreviaturas que no sean del dominio.
- Sin clases donde basta una función. `petro-calc` es funcional.
- Exportaciones con nombre; sin `export default` salvo donde el framework lo exige.

## Unidades y datos

- La base de datos, la API y la memoria de la aplicación trabajan en SI. La conversión a unidades de campo ocurre solo al mostrar o al importar.
- Toda variable o columna numérica con unidad la lleva en el nombre: `bhpBar`, `oil_sm3`, `tempC`.
- Un dato ausente es `null`, nunca `0`, `-1` ni `NaN`.
- No se interpola ni se rellena un dato sin que el usuario lo vea indicado.
- No se inventan datos. Si una fuente no trae algo, la interfaz lo dice.

## Estructura y dependencias

- Se respetan las reglas de dependencia de `03-arquitectura.md`.
- Una dependencia nueva se justifica en el PR: qué resuelve y por qué no basta lo que hay.
- La web no accede a la base de datos. La API no hace cálculos de ingeniería.

## Base de datos

- Todo cambio de esquema es una migración nueva. Las publicadas no se editan.
- Todo SQL es parametrizado. Nunca se concatena una entrada del usuario.
- Las consultas espaciales usan los índices GiST; se comprueba con `EXPLAIN` si la consulta es nueva.

## Git

- Rama principal: `main`, siempre desplegable.
- Ramas cortas: `feat/well-detail-panel`, `fix/null-pressure-gap`, `docs/api-errors`.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/): `feat(web): add well clustering`, `fix(etl): skip negative volumes`, `docs: update API errors`.
- Ámbitos: `web`, `api`, `calc`, `types`, `etl`, `db`, `docs`, `ci`.
- Un PR hace una cosa. Si el título necesita una "y", son dos PR.
- No se sube a `main` sin que pase el CI.

## Pruebas

| Capa | Herramienta | Qué se prueba |
| --- | --- | --- |
| `petro-calc` | Vitest | Cada función contra valores publicados y casos límite; cobertura de 90% o más |
| `shared-types` | Vitest | Esquemas: aceptan lo válido y rechazan lo inválido |
| `api` | Vitest + base de datos de prueba | Cada ruta: caso feliz, parámetros inválidos y recurso inexistente |
| `etl` | Vitest | Normalización y descarte con archivos pequeños de ejemplo |
| `web` | Playwright | Flujos principales: mapa, filtros, ficha, ajuste, importación |

- Una corrección de error llega con la prueba que lo habría detectado.
- Las pruebas no dependen de la red ni de los datos reales. Usan los datos sintéticos de `db/seed`.
- Los números se comparan con tolerancia explícita, no con igualdad exacta.

## Interfaz

- Navegable por teclado. Foco visible.
- Contraste AA. El color nunca es la única señal.
- Cada gráfica tiene vista de tabla.
- Estados de carga, vacío y error en cada vista que pide datos.
- El estado de la vista vive en la URL, según `09-alertas-importacion-url.md`.

## Seguridad

- Sin secretos en el repositorio. Variables en `.env`, con `.env.example` al día.
- La API es de solo lectura y usa un usuario de base de datos sin permisos de escritura.
- CORS limitado al origen de la web. Límite de peticiones por IP.
- Los errores devuelven un código y un mensaje; el detalle va al log.
- El CSV importado se trata como entrada no confiable: se valida, se limita en tamaño y nunca se interpreta como HTML.

## Documentación

- Un cambio de esquema, de ruta o de fórmula actualiza su documento en el mismo PR.
- Una decisión que cambia el diseño se registra como ADR antes de implementarla.
- Las funciones públicas de `petro-calc` llevan TSDoc con unidades y referencia.
- El `README.md` de la raíz siempre permite levantar el proyecto desde cero.

## Definición de terminado

Un cambio está terminado cuando:

1. Cumple el requisito o la tarea de `11-plan-de-fases.md` a la que responde.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
3. Tiene pruebas proporcionales al riesgo.
4. La documentación afectada está actualizada.
5. Funciona con `docker compose up` desde cero.
6. No añade datos de terceros ni secretos al repositorio.

## Trabajo con agentes de IA

- El agente lee `docs/` antes de proponer cambios y cita el documento en el que se apoya.
- Trabaja una fase a la vez, y dentro de la fase, una tarea a la vez.
- Si el diseño es ambiguo o contradictorio, pregunta. No rellena con supuestos.
- Si cree que el diseño está mal, lo dice y propone un ADR. No lo cambia en silencio.
- No transcribe coeficientes ni constantes de memoria sin marcarlos para verificación y sin una prueba que los respalde.
- No marca una tarea como hecha si las pruebas no pasan.
- Al terminar una tarea, resume qué cambió, qué quedó pendiente y qué decisiones tomó.
