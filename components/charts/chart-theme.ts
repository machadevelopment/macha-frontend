// design guide.md §5 "Charts" — ejes en --faint, grid en --soft, series monocromas
// con acento de estado solo para positivo/negativo. Consumido por `@tremor/react`
// (ver la nota "Known deviation" en CLAUDE.md sobre por qué `@tremor/react` y no
// Tremor Raw).
//
// ══════════════════════════════════════════════════════════════════════════════════
// POR QUÉ ACÁ NO HAY UN OBJETO DE ESTILO DE EJE (CU-868knx0vh — hallazgo VERIFICADO)
// ══════════════════════════════════════════════════════════════════════════════════
//
// Este archivo exportaba un `chartAxisStyle = { fontSize, fontFamily, fill, ... }` que
// las pantallas esparcían como props sueltas sobre el chart (`{...chartAxisStyle}`).
// NO FUNCIONABA, y se comprobó de tres formas contra el paquete instalado (3.18.7):
//
//   1. `AreaChartProps extends React.HTMLAttributes<HTMLDivElement>`, y el `dist` hace
//      `Object.assign({ ref, className }, resto)` sobre el `<div>` CONTENEDOR. Todo lo
//      que Tremor no conoce aterriza ahí, no en el SVG.
//   2. Renderizado real (`renderToStaticMarkup`) del chart con ese spread:
//        <div class="w-full h-80" font-size="11" font-family="var(--font-ui-stack)"
//             fontVariantNumeric="tabular-nums" fill="var(--faint)">
//      Son ATRIBUTOS HTML sobre un `<div>`. `fill`/`font-size` son atributos de
//      presentación de SVG: sobre un elemento HTML no existen y el navegador los
//      ignora. React además avisa por consola con `fontVariantNumeric`.
//   3. Los atributos no heredan (solo hereda el CSS), así que tampoco llegaban al
//      `<text>` del tick que cuelga varios niveles más abajo.
//
// De paso quedó al descubierto algo peor: Tremor pinta sus ticks con `fill=""` más las
// clases `fill-tremor-content` / `text-tremor-label`, y ESAS CLASES NO EXISTEN en
// nuestro CSS — nunca registramos el tema de Tremor en `tailwind.config.ts`. Compilando
// el CSS del proyecto no aparece ni una vez. O sea que el tick se quedaba con el `fill`
// por defecto del SVG (negro) sobre una tarjeta `#171717` en modo oscuro.
//
// LA ÚNICA VÍA QUE SÍ LLEGA AL SVG ES CSS, porque `fill` es también una propiedad CSS y
// el selector de clase gana sobre el atributo de presentación. Por eso el estilo de eje,
// grid, cursor de tooltip y leyenda vive en `styles/globals.css` bajo `.macha-chart`, y
// acá solo queda el nombre de esa clase. No se envuelve en un objeto de props porque el
// mecanismo no es "props": es la cascada.
/**
 * Clase que engancha el CSS de charts de `globals.css`. No se pone a mano en las
 * pantallas: la aplican los envoltorios de `chart-primitives.tsx`, que son la única
 * puerta a `@tremor/react` (lo defiende `chart-surface.test.ts`).
 */
export const CHART_SURFACE = 'macha-chart';

// Tremor's `colors` prop takes its own named palette (see colorValues in its
// types), not arbitrary CSS vars — 'neutral' is the closest monochrome match for
// the default series; 'emerald'/'rose' are reserved for the positive/negative
// accent series (AR/AP aging, margin) per the "color only signals state" rule.
//
// EL SALVIA DE MARCA NO ENTRA ACÁ NUNCA. En una serie, un eje o un tooltip el color
// significa DATO, y el salvia significa "esto es Macha" (regla de los dos verdes,
// design guide §2.6). Si algún día se agrega un color de serie, hay que sumarlo también
// al `safelist` de `tailwind.config.ts` o sale negro — está explicado en el comentario
// largo de ese archivo.
export const chartColors = {
  neutral: 'neutral',
  positive: 'emerald',
  negative: 'rose',
} as const;
