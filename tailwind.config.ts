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
      /*
       * `app` (1080px) es donde el shell gana su rail derecho de 348px.
       *
       * `kpi6` sale de MEDIR, no de la escala redonda de Tailwind. El dashboard descuenta
       * sidebar (264px), paddings (48px) y rail (364px), más el relleno de la tarjeta (32px) y
       * los huecos de 12px, así que el ancho útil de una tarjeta no tiene nada que ver con el
       * del viewport:
       *
       *     útil(v, n) = (v − 676 − 12·(n−1)) / n − 32
       *
       * ═══ HISTORIA, PORQUE ESTOS CORTES YA SE MOVIERON TRES VECES ═══
       *
       * CU-868ktknbq los bajó de `2xl` (1536px) porque una MacBook de 14" da 1512px y caía a 3
       * columnas justo en la máquina donde se demuestra el producto. CU-868ku6r48 corrigió ese
       * arreglo —había copiado el `lg` (1024px) del prototipo, donde una tarjeta queda en 39px
       * útiles y `GTQ 389.9K` son diez caracteres— y fijó `kpi4: 1300` y `kpi5: 1480` midiendo
       * dónde la cifra ENTRA.
       *
       * CU-868kuw01m agrega la sexta tarjeta (COGS) y con eso los pasos de 4 y 5 se van: seis
       * tarjetas solo se reparten parejo entre 1, 2, 3 y 6 — en cuatro columnas la fila queda
       * 4+2 y en cinco 5+1, una huérfana al lado de cuatro huecos.
       *
       * ═══ DE DÓNDE SALE 1600 ═══
       *
       * Medido en el navegador con la SF Pro real, `tabular-nums` y el tracking de cada token,
       * el peor caso realista de `formatMoneyCompact` (`GTQ 389.9K`, 10 caracteres → `kpi-sm`
       * por `escalaDeCifra`) mide 107,1px a 20px. Con seis columnas:
       *
       *     viewport   6 col → útil    ¿entra `GTQ 389.9K` (107,1px)?
       *     1512px          97,3px      no — se cortaría
       *     1570px         107,0px      justo en el límite
       *     1600px         112,0px      sí, con margen
       *
       * Un corte más bajo no muestra más información: muestra la misma cifra cortada, y en una
       * cifra financiera cortar no recorta, MIENTE (ver `escalaDeCifra` en `kpi-card.tsx`).
       */
      screens: { app: '1080px', kpi6: '1600px' },
      colors: {
        background: 'var(--background)',
        /*
         * El lienzo CON su alfa ya adentro, para la barra de la landing. No se consigue
         * con `bg-background/[0.72]`: el modificador de opacidad sobre un color que es
         * `var(--x)` con un hex adentro emite `rgb(var(--background) / .72)`, inválido, y
         * el navegador tira la declaración — la barra quedaba transparente con desenfoque.
         * Medido contra la landing corriendo. Ver `--glass` en globals.css.
         */
        glass: 'var(--glass)',
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
        /**
         * MARCA — salvia del Brand Book (CU-868knx0vh). Este archivo decía antes que no
         * existía un verde de marca y que agregarlo rompería la regla de "el color solo
         * señala estado". La regla no cambia; lo que cambia es que ahora hay DOS verdes
         * con roles que no se pisan, y este NO es el de los datos:
         *
         *   · `brand` (salvia, desaturado)  → "esto es Macha". Identidad, Insight Point,
         *     vitrina, cabecera de reportes. Nunca sobre un dato.
         *   · `success` (#16A34A, saturado) → "este dato va bien". Delta, chips, series.
         *
         * Si estás por usar `brand` para pintar un número, es `success`/`danger` lo que
         * buscas.
         */
        brand: {
          DEFAULT: 'var(--brand)',
          /** Extremo claro del degradado del Brand Book (#F4F4F2 muestreado del isotipo). */
          light: 'var(--brand-light)',
          strong: 'var(--brand-strong)',
          soft: 'var(--brand-soft)',
          bd: 'var(--brand-bd)',
          on: 'var(--brand-on)',
          /**
           * Tinta de marca sobre `brand-soft`, NO sobre el salvia (para eso está `on`).
           * Existe porque `brand-on` es casi negra en los dos temas —el salvia no cambia
           * de tono— y sobre el `brand-soft` oscuro se vuelve invisible. Ver globals.css.
           */
          ink: 'var(--brand-ink)',
        },
      },
      backgroundImage: {
        /**
         * Los cuatro degradados del Brand Book. Salen de tokens y no de literales porque
         * los cuatro cambian entre claro y oscuro (ver globals.css).
         *
         *   · `bg-insight`      el Insight Point como FIGURA (sello, avatar de marca)
         *   · `bg-insight-glow` el mismo recurso como ATMÓSFERA de fondo, muy difuminado y
         *                       con alfa: para vitrina. NUNCA detrás de tablas ni gráficas.
         *   · `bg-brand-bar` / `bg-brand-bar-inverse` las barras del isotipo, con el
         *                       degradado contrapuesto que tiene el asset original.
         */
        insight: 'var(--brand-gradient)',
        'insight-glow': 'var(--brand-glow)',
        'brand-bar': 'var(--brand-bar)',
        'brand-bar-inverse': 'var(--brand-bar-inverse)',
      },
      fontFamily: {
        /**
         * SF Pro Display, auto-hospedada con `next/font/local` (`lib/fonts.ts`). El stack
         * completo vive en `--font-ui-stack` (globals.css), con la SF del sistema detrás
         * como respaldo por si el archivo no carga.
         *
         * OJO: la licencia de SF Pro es de Apple y no cubre servirla desde web. Está
         * documentado en `lib/fonts.ts` y es una decisión tomada por el dueño, no un
         * descuido.
         */
        ui: ['var(--font-ui-stack)'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '5px', md: '8px', lg: '10px', xl: '11px', pill: '22px' },
      /**
       * CU-868kt8bg0 — "transiciones más suaves".
       *
       * El prototipo anima todo con la MISMA curva: `ease: [0.2, 0, 0, 1]` a 0,2 s, escrita
       * una sola vez y reusada en cada componente (`const transition` en `KpiCard.tsx`).
       * Es una curva que arranca de golpe y frena largo — el movimiento se detiene sin
       * rebote y sin ese último tramo lento que hace sentir pesada a `ease-in-out`.
       *
       * Se sobrescribe el `DEFAULT` de Tailwind en vez de agregar una clase nueva, y esa es
       * toda la gracia: `transition-colors` sin más modificadores YA emite
       * `cubic-bezier(0.4,0,0.2,1)` a 150 ms, así que las veinte transiciones que hay en el
       * producto adoptan la curva sin tocar un solo componente — y la número veintiuno nace
       * con ella. Ponerla como clase opcional habría dejado la mitad del producto animando
       * con la curva de fábrica, que es la situación que este ticket vino a corregir.
       */
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' },
      transitionDuration: { DEFAULT: '200ms' },
      fontSize: {
        h1: ['27px', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '700' }],
        /**
         * CU-868knx0vh (zona de vitrina): titular de las pantallas que ve un cliente nuevo
         * o un inversionista (`/`, registro, invitación, 404, error).
         *
         * `h1` (27px) es el título de una pantalla DE PRODUCTO, donde compite con KPIs,
         * tablas y una barra de acciones; en una vitrina —una sola columna centrada, sin un
         * dato en pantalla— se lee timidísimo, y era literalmente lo que el ticket llamaba
         * "falta jerarquía tipográfica". No se reusa `statbig` (38px) aunque el tamaño sea
         * parecido: ese token significa "esto es una cifra grande" y su tracking está
         * calibrado para dígitos, no para prosa.
         */
        display: ['38px', { lineHeight: '1.1', letterSpacing: '-0.035em', fontWeight: '700' }],
        /**
         * CU-868kt8bg0 · TÍTULO DE PANTALLA, tomado del prototipo.
         *
         * El prototipo titula TODAS sus páginas igual: `text-xl font-semibold` (20px/600)
         * con el `letter-spacing: -0.02em` que su `@layer base` le pone a h1/h2/h3. Nunca
         * usa 27px ni peso 700 para el título de una pantalla de producto.
         *
         * `h1` (27px/700) NO desaparece: sigue siendo el titular de las pantallas de
         * VITRINA junto a `display`. Lo que cambia es que una pantalla de producto —
         * dashboard, analítica, reportes— ya no lo usa, porque ahí el título compite con
         * KPIs y tablas y a 27px se lleva un peso visual que el dato debería tener.
         */
        /**
         * ═══════════════════════════════════════════════════════════════════════════════════
         * TIPOGRAFÍA DE LA LANDING — medida del Figma, no elegida (2026-08-21)
         * ═══════════════════════════════════════════════════════════════════════════════════
         *
         * `macha.finance` es una landing de marketing y su escala no es la del producto ni la
         * de las pantallas de vitrina. Medido con la API de Figma sobre el frame `4:218`:
         *
         *   pieza                        Figma        token
         *   ──────────────────────────    ─────────    ──────────────
         *   titular del hero             88px / 400   `hero`
         *   titular grande de sección    68px / 400   `sectionbig`
         *   titular de sección           52px / 400   `section`
         *   bajada                       22px / 300   `lead`
         *
         * ═══ PESO 400 Y 300, NO 700 ═══
         *
         * `display` (38px/700) no sirve acá y no es cuestión de tamaño: en la landing los
         * titulares son GRANDES Y FINOS, que es lo que los hace leerse como una portada. A
         * 88px el peso 700 es un muro; el diseño lo resuelve con tamaño, no con grosor. Reusar
         * `display` habría dado un titular más chico y más pesado a la vez.
         *
         * `lead` va en 300 —más liviano que `body` (400)— porque a 22px el peso normal compite
         * con el titular que tiene arriba.
         *
         * ═══ `clamp()` Y NO BREAKPOINTS ═══
         *
         * 88px en un teléfono no entra: son cuatro caracteres por línea. Se escala con `clamp()`
         * en el propio token en vez de con clases responsive por pantalla, por dos razones:
         * el valor mínimo y el máximo quedan JUNTOS donde se lee el tamaño, y ninguna sección
         * puede olvidarse de poner la variante móvil — que es exactamente cómo un titular
         * termina desbordando en un teléfono sin que nadie lo note en el escritorio.
         *
         * El `vw` intermedio se eligió para que el cruce ocurra cerca de los 1280px: por encima
         * de eso se ve el tamaño del diseño, por debajo baja de forma continua.
         */
        hero: [
          'clamp(38px, 6.2vw, 88px)',
          { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '400' },
        ],
        sectionbig: [
          'clamp(32px, 4.8vw, 68px)',
          { lineHeight: '1.08', letterSpacing: '-0.03em', fontWeight: '400' },
        ],
        section: [
          'clamp(28px, 3.7vw, 52px)',
          { lineHeight: '1.12', letterSpacing: '-0.03em', fontWeight: '400' },
        ],
        lead: [
          'clamp(17px, 1.6vw, 22px)',
          { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '300' },
        ],

        /*
         * ═══════════════════════════════════════════════════════════════════════════════════
         * ESCALA DE LA LANDING — MEDIDA DEL FIGMA, NO ELEGIDA
         * ═══════════════════════════════════════════════════════════════════════════════════
         *
         * Keneth pidió que la landing quedara idéntica al Figma. Extraje de la API el tamaño,
         * el peso y el tracking de los 201 nodos de texto del frame y salió esta tabla. El
         * hallazgo que la hace necesaria: yo había construido la landing con los tokens del
         * PRODUCTO, y no coinciden — `micro` vale 10px y el diseño usa 12, 13, 14 o 15 según el
         * rol. O sea que todo el texto secundario de la landing estaba entre un 20 % y un 50 %
         * más chico de lo diseñado, y eso es la mitad de por qué "se veía distinto" aun con el
         * contenido correcto.
         *
         * Los tokens del producto NO se tocan: están medidos contra el prototipo de Lovable y
         * tienen sus propios tests (`styles/densidad-prototipo.test.ts`). La landing es otra
         * superficie con otra escala, y mezclarlas rompería una de las dos.
         *
         *     rol                                  medido        token
         *     ─────────────────────────────────────────────────────────────────────
         *     eyebrow de sección y de tarjeta      12 / 600 / +0.14em   leyebrow
         *     numeración 01 02 03                  14 / 300 / +0.14em   lnum
         *     bajada del hero y del cierre         22 / 300             lhero
         *     bajada de sección                    17 / 300             lsub
         *     prosa: descripciones, features       15 / 300             lprose
         *     título de insight / garantía / botón 15 / 600             lstrong
         *     fila de tabla, desc. de insight      14 / 300             lrow
         *     título de etapa                      14 / 600             lstage
         *     sub de etapa, copyright, "vs julio"  13 / 300             lsmall
         *     título de tarjeta de mockup          13 / 600             lcard
         *     meta ("Hace 12 minutos · Márgenes")  12 / 300             lmeta
         *     chip de estado                       12 / 600             lchip
         *     antes/después y pregunta del asesor  26 / 300             lline
         *     respuesta del asesor                 21 / 300             lanswer
         *
         * SIN `clamp()` A PROPÓSITO, al revés que los titulares: entre 12 y 26px el texto no
         * desborda un teléfono, y escalar la prosa con la ventana la vuelve ilegible en los
         * extremos. Los titulares sí escalan porque 88px no entran en 375px de ancho.
         *
         * El PESO no va en el token —salvo donde es invariable— porque el diseño usa el mismo
         * tamaño con dos pesos según el rol (26/300 para "antes" y 26/400 para "con Macha").
         */
        leyebrow: ['12px', { lineHeight: '1.2', letterSpacing: '0.14em', fontWeight: '600' }],
        lnum: ['14px', { lineHeight: '1', letterSpacing: '0.14em', fontWeight: '300' }],
        lhero: ['22px', { lineHeight: '1.45', fontWeight: '300' }],
        lsub: ['17px', { lineHeight: '1.5', fontWeight: '300' }],
        lprose: ['15px', { lineHeight: '1.55', fontWeight: '300' }],
        lstrong: ['15px', { lineHeight: '1.35', fontWeight: '600' }],
        lrow: ['14px', { lineHeight: '1.5', fontWeight: '300' }],
        lstage: ['14px', { lineHeight: '1.3', fontWeight: '600' }],
        lsmall: ['13px', { lineHeight: '1.4', fontWeight: '300' }],
        lcard: ['13px', { lineHeight: '1.3', fontWeight: '600' }],
        lmeta: ['12px', { lineHeight: '1.4', fontWeight: '300' }],
        lchip: ['12px', { lineHeight: '1', fontWeight: '600' }],
        lline: ['26px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        lanswer: ['21px', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '300' }],
        pagetitle: ['20px', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '600' }],
        cardh2: ['15px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        // 12px sin tracking: el subtítulo que el prototipo cuelga del título de pantalla
        // (`text-xs text-muted-foreground`). No es `eyebrow` — ese lleva mayúsculas y
        // 0.08em de tracking, que es otra cosa: una etiqueta, no una frase.
        caption: ['12px', { lineHeight: '1.4' }],
        body: ['14px', { lineHeight: '1.5' }],
        // Escala del prototipo "MVP Macha": la cifra de KPI baja de 29px/700 a 24px/600.
        // Menos peso y menos tamaño; el énfasis lo da el contraste con la etiqueta, no el bulto.
        //
        // CU-868knx0vh: el tracking se cierra un punto (-0.03 → -0.035 en `kpi`, -0.035 →
        // -0.04 en `statbig`) porque estas cifras ya no se pintan en monoespaciada. SF Pro
        // e Inter tienen las cifras más angostas que JetBrains Mono, y el tracking que
        // estaba calibrado para el ancho fijo del mono deja las cifras sueltas al soltarlo.
        kpi: ['24px', { lineHeight: '1.1', letterSpacing: '-0.035em', fontWeight: '600' }],
        /*
         * ═══ LA CIFRA DE KPI SE ENCOGE ANTES QUE CORTARSE (CU-868ku6r48) ═══
         *
         * Medido: con el grid de 5 columnas y el rail de 348px del dashboard, una tarjeta mide
         * 71px de ancho útil a 1080px y 111px a 1280px. A 24px ahí caben 3 y 6 caracteres — y
         * `GTQ 389.9K` son diez.
         *
         * Lo que hacía el código era `truncate`, o sea puntos suspensivos. En un dato financiero
         * eso no es un recorte cosmético: si lo que se pierde es la `K`, `GTQ 389.9K` se lee como
         * trescientos ochenta y nueve quetzales cuando son trescientos ochenta y nueve mil. Un
         * factor de MIL, en la cifra principal del dashboard, sin que nada falle.
         *
         * Así que la cifra baja de tamaño según su largo y `truncate` queda como red que ya casi
         * nunca se toca. Los dos pasos conservan el peso y el tracking de `kpi`: es la misma
         * cifra más chica, no otra jerarquía.
         */
        'kpi-sm': ['20px', { lineHeight: '1.15', letterSpacing: '-0.03em', fontWeight: '600' }],
        'kpi-xs': ['17px', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '600' }],
        statbig: ['38px', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
        // Prototipo: 11px con tracking 0.08em (el nuestro era 10.5/0.13, más espaciado).
        eyebrow: ['11px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '500' }],
        chip: ['9.5px', { lineHeight: '1', letterSpacing: '0.09em', fontWeight: '600' }],
        /*
         * ═══ CU-868ktknbq · EL DATO DE APOYO DE UNA TARJETA DE KPI ═══
         *
         * La cifra exacta, la frase de ayuda y el "vs mes anterior" iban en `body` (14px/1.5).
         * El prototipo los pone en 10px con interlínea apretada, y medido contra
         * `juanrodriguezbz/mvp-macha` esa es la ÚNICA diferencia de escala real de la tarjeta:
         * la etiqueta (11px/500), la cifra (24px/600) y el relleno (16px) ya coincidían.
         *
         * O sea que el reporte "todo se ve muy grande" no era la tipografía titular — era esto,
         * tres líneas por tarjeta a 14px/1.5 (21px de alto cada una) donde el prototipo gasta
         * 13px. Con el sparkline y el delta en medio, la tarjeta medía ~258px contra ~152px.
         *
         * No se reusa `chip` (9.5px): ese lleva mayúsculas, 0.09em de tracking y peso 600
         * porque es un RÓTULO. Esto es un dato que se lee.
         */
        micro: ['10px', { lineHeight: '1.3' }],
        /*
         * El delta en línea (↗ +30.4%), que en el prototipo va en mono a 12px y SIN caja.
         * Token propio y no `caption` porque su interlínea es 1 —se alinea con un ícono de
         * 12px al lado— y porque el día que se ajuste, se ajusta el delta y no todos los
         * subtítulos del producto.
         */
        delta: ['12px', { lineHeight: '1', fontWeight: '500' }],
      },
      // `card` sale de un token porque cambia entre claro y oscuro (en oscuro no es una
      // sombra negra sino un filo de luz — ver globals.css). `tab` se queda literal: es un
      // detalle del control de pestañas que no depende del tema.
      //
      // `btn` (CU-868knx0vh) sigue a `card`: mismo motivo —cambia de naturaleza entre
      // temas— y por eso también sale de un token y no de un literal.
      boxShadow: {
        tab: '0 1px 2px rgba(0,0,0,.06)',
        card: 'var(--shadow-card)',
        btn: 'var(--shadow-btn)',
      },
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
