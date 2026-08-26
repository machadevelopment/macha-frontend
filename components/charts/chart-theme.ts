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

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * PALETA CATEGÓRICA DE MARCA (reporte de Jose sobre los colores de las gráficas)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTO ES UNA EXCEPCIÓN ACOTADA A LA REGLA DE LOS DOS VERDES, Y HAY QUE SABERLO.
 *
 * La regla dice que el salvia es identidad y nunca dato. El comentario de arriba lo repite. La
 * excepción se sostiene porque lo que la regla PROTEGE es que el color no mienta sobre el
 * estado del dato, y una rampa de tonos del MISMO verde no puede decir "bueno" ni "malo": no
 * hay contraste semántico entre dos rebanadas de un donut, solo identidad visual. Lo que la
 * regla prohíbe —y esto sigue prohibiendo— es el salvia PLANO junto al verde y el rojo
 * funcionales, donde sí compiten.
 *
 * ═══ DÓNDE VA Y DÓNDE NO ═══
 *
 * Va en las gráficas CATEGÓRICAS: gastos por categoría, ventas por categoría o por tienda, top
 * de productos. Ahí cada rebanada es un rubro y ninguna es mejor que otra.
 *
 * NO va en las de ESTADO: los tramos de antigüedad de CxC/CxP, el margen, el delta de un KPI.
 * `positive` y `negative` se quedan exactamente como están, y eso no es una omisión — es la
 * mitad de la regla que sigue viva. Tampoco va en las de TENDENCIA (`TrendArea`), que son una
 * serie sola y no tienen categorías que distinguir.
 *
 * ═══ SOBRE LA PREMISA DEL REPORTE ═══
 *
 * El ticket pedía "usar los colores de las gráficas de la Landing como estándar". Vale
 * aclararlo porque es circular: las gráficas de la landing son CAPTURAS PNG de esta misma app
 * (está documentado en `landing-producto.tsx`), así que ya muestran el mismo gris que se
 * reportó como genérico. No había una paleta distinta ahí que copiar; el pedido real —y
 * válido— era que el gris de Tremor se sintiera de marca. La landing va a reflejar esto sola
 * la próxima vez que se tomen capturas.
 *
 * El ORDEN va de más claro a más oscuro: la primera categoría es la de mayor valor (las
 * pantallas ordenan por monto), así que el contraste crece con la importancia.
 */
/*
 * Tipado como `string[]` mutable y no `as const`: el prop `colors` de Tremor es `string[]`, y
 * un `readonly` no se le puede asignar. Los literales no le sirven a nadie acá.
 */
export const chartCategorico: string[] = [
  'sagedeep',
  'sage',
  'sagemist',
  'sageink',
  'sagepale',
  // De apoyo, cuando hay más categorías que tonos en la rampa. Neutro y no un sexto verde:
  // inventar un tono nuevo sería salirse de la rampa que el Brand Book fija.
  'neutral',
];
