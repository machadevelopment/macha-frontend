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
      // CU-868khvzbd: el breakpoint del design guide §Responsive es 1080px, no los
      // 1024px de `lg`. Se agrega como screen propio en vez de redondear al de
      // Tailwind: 1080 es donde el sidebar de 212px + el contenido dejan de caber
      // cómodamente, y aproximarlo movería el punto exacto que el guide especifica.
      // `sm` (640px) sí es el del guide, así que se reutiliza tal cual.
      screens: { app: '1080px' },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        // Alineación con el prototipo "MVP Macha": el panel lateral no es exactamente la
        // superficie de tarjeta, es un blanco apenas más frío. Con el lienzo ya en
        // blanco, sin este token el sidebar quedaba indistinguible de la página.
        sidebar: 'var(--sidebar)',
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
        // Escala del prototipo "MVP Macha": la cifra de KPI baja de 29px/700 a 24px/600.
        // Menos peso y menos tamaño; el énfasis lo da el contraste con la etiqueta, no el bulto.
        kpi: ['24px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '600' }],
        statbig: ['38px', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '700' }],
        // Prototipo: 11px con tracking 0.08em (el nuestro era 10.5/0.13, más espaciado).
        eyebrow: ['11px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '500' }],
        chip: ['9.5px', { lineHeight: '1', letterSpacing: '0.09em', fontWeight: '600' }],
      },
      boxShadow: { tab: '0 1px 2px rgba(0,0,0,.06)' },
      /**
       * Ancho máximo del shell (design guide.md §4.4).
       *
       * Era 1320px y se subió a 1920 porque en un monitor normal de trabajo (~1500px de
       * viewport) el tope dejaba franjas de fondo a los lados y metía TODO el contenido en
       * ~1100px útiles: 1320 menos los 212 del sidebar. Con cinco tarjetas de KPI en fila
       * más dos charts lado a lado, eso se lee apretado y chico — que fue exactamente el
       * reporte.
       *
       * Sigue habiendo tope, y no es indecisión: sin ninguno, en un ultrawide de 2560px las
       * tablas y los charts se estiran hasta que la vista tiene que barrer la pantalla
       * completa para cruzar una fila. 1920 cubre a pantalla llena los tamaños reales de
       * laptop y monitor sin llegar a eso.
       *
       * OJO AL APLICARLO: `max-w-app` está puesto en el shell Y otra vez en el `<main>` de
       * cada página. Anidado era inofensivo (el interior nunca podía superar al padre), pero
       * significa que este número manda en los dos niveles a la vez — subirlo solo en el
       * shell no habría hecho nada, porque cada `<main>` habría vuelto a cortar en 1320.
       */
      maxWidth: { app: '1920px' },
    },
  },
  plugins: [],
} satisfies Config;
