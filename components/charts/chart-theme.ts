// design guide.md §5 "Charts" — axes in --faint, grid in --soft, series monochrome
// with a state accent only for positive/negative. Consumed by @tremor/react chart
// props (`colors`, custom tick/grid styling) — see the "Known deviation" note in
// CLAUDE.md on why @tremor/react instead of Tremor Raw.
//
// CU-868knx0vh: los ejes pasan de la monoespaciada a la tipografía de interfaz, igual que
// el resto de las cifras del producto. `tabular-nums` es lo que mantiene alineadas las
// marcas del eje Y —no la familia—, y es un ajuste independiente que SF Pro e Inter
// traen. En SVG no basta la clase de Tailwind: Recharts pinta los ticks como `<text>` con
// estilo inline, así que la propiedad va acá explícita.
export const chartAxisStyle = {
  fontSize: 11,
  fontFamily: 'var(--font-ui-stack)',
  fontVariantNumeric: 'tabular-nums',
  fill: 'var(--faint)',
};
export const chartGridStroke = 'var(--soft)';

// Tremor's `colors` prop takes its own named palette (see colorValues in its
// types), not arbitrary CSS vars — 'neutral' is the closest monochrome match for
// the default series; 'emerald'/'rose' are reserved for the positive/negative
// accent series (AR/AP aging, margin) per the "color only signals state" rule.
export const chartColors = {
  neutral: 'neutral',
  positive: 'emerald',
  negative: 'rose',
} as const;
