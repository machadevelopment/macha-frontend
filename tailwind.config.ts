import type { Config } from 'tailwindcss';

// Exact token set from design guide.md §11.3. darkMode: 'class'.
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    // @tremor/react generates Tailwind class names at runtime (e.g. bg-blue-500 for
    // chart series colors) — without scanning its dist, Tailwind's JIT purge strips
    // them and Tremor renders unstyled.
    './node_modules/@tremor/react/dist/**/*.js',
  ],
  // CU-868khvz06: escanear el dist de Tremor NO alcanza. Sus clases de color de serie
  // se construyen con template literals (`fill-${color}-${shade}`, `stroke-${r}` — se
  // pueden ver en node_modules/@tremor/react/dist), y el JIT de Tailwind solo extrae
  // strings LITERALES. Resultado: `fill-rose-500` nunca se generaba, las barras se
  // quedaban sin fill y salían negras — las dos series de CxC/CxP eran idénticas, y en
  // dark mode desaparecían contra el fondo oscuro. La leyenda sí tenía color porque
  // toma otra ruta, lo que hacía el síntoma aún más confuso.
  //
  // El safelist fuerza a generar esas clases para los únicos colores que usamos
  // (chart-theme.ts: neutral / emerald / rose). Si se agrega un color de serie ahí,
  // hay que agregarlo aquí o volverá a salir negro.
  safelist: [
    {
      pattern: /(fill|stroke|bg|text|border)-(neutral|emerald|rose)-(300|400|500|600)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        muted: { DEFAULT: 'var(--fill)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)' },
        faint: 'var(--faint)',
        soft: 'var(--soft)',
        success: { DEFAULT: 'var(--green)', bg: 'var(--green-bg)', bd: 'var(--green-bd)' },
        danger: { DEFAULT: 'var(--red)', bg: 'var(--red-bg)', bd: 'var(--red-bd)' },
        warning: {
          DEFAULT: 'var(--amber)',
          bg: 'var(--amber-bg)',
          bd: 'var(--amber-bd)',
          accent: 'var(--amber-accent)',
        },
      },
      fontFamily: {
        ui: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '5px', md: '8px', lg: '10px', xl: '11px', pill: '22px' },
      fontSize: {
        h1: ['27px', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '700' }],
        cardh2: ['15px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5' }],
        kpi: ['29px', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
        statbig: ['38px', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '700' }],
        eyebrow: ['10.5px', { lineHeight: '1.2', letterSpacing: '0.13em', fontWeight: '500' }],
        chip: ['9.5px', { lineHeight: '1', letterSpacing: '0.09em', fontWeight: '600' }],
      },
      boxShadow: { tab: '0 1px 2px rgba(0,0,0,.06)' },
      maxWidth: { app: '1320px' },
    },
  },
  plugins: [],
} satisfies Config;
