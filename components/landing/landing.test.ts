import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * La landing pública de `macha.finance` (2026-08-21).
 *
 * Lo que se fija acá son decisiones que se pueden deshacer sin que nada falle, y una de ellas es
 * la que más importa del archivo: que los enlaces legales NO existan mientras los documentos no
 * existan.
 */

const raiz = join(import.meta.dir, '..', '..');
const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

/** El fuente sin comentarios, para las aserciones NEGATIVAS. */
const leerCodigo = (rel: string) =>
  leer(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('el CTA de demo lleva al formulario', () => {
  test('el correo de contacto sigue publicado', () => {
    // Canal paralelo al formulario; si desaparece, el footer pierde el único contacto directo.
    expect(leer('components/landing/demo-link.ts')).toContain('contact@machafinance.com');
  });

  test('los CTAs apuntan al ancla del formulario, no a mailto', () => {
    const link = leerCodigo('components/landing/demo-link.ts');
    expect(link).toContain("ANCLA_DEMO = '#demo'");
    expect(link).not.toContain('mailto:');
    expect(link).not.toContain('encodeURIComponent');

    for (const f of ['landing-nav.tsx', 'landing-hero.tsx', 'landing-secciones.tsx']) {
      const code = leerCodigo(`components/landing/${f}`);
      expect(code, f).not.toMatch(/mailto:/);
      expect(code, f).toContain('ANCLA_DEMO');
    }
    // El footer muestra el correo como canal paralelo (mailto del buzón), no como CTA principal.
    expect(leerCodigo('components/landing/landing-footer.tsx')).toContain('ANCLA_DEMO');
    expect(leerCodigo('app/page.tsx')).toContain('id="demo"');
    expect(leerCodigo('app/page.tsx')).toContain('LandingFormularioDemo');
    for (const d of [es, en]) {
      expect(d.landing.form.submit.trim()).not.toBe('');
      expect(d.landing.form.success.trim()).not.toBe('');
    }
  });
});

describe('las legales se nombran pero NO se enlazan', () => {
  test('el footer no tiene un enlace a documentos que no existen', () => {
    /*
     * ═══ LA DECISIÓN QUE ESTE TEST PROTEGE ═══
     *
     * El diseño lista "Aviso de privacidad", "Términos" y "Política de datos". Esos documentos
     * todavía no existen, así que se pintan como TEXTO.
     *
     * Un `href="#"` que no lleva a nada, en un producto que maneja la contabilidad de terceros,
     * es peor que la ausencia del enlace: quien lo aprieta buscando qué hacemos con sus datos y
     * no llega a ninguna parte aprende algo sobre nosotros, y no es lo que queremos que aprenda.
     *
     * Cuando los documentos existan, esto se cambia por `<Link>` y el test se actualiza. Lo que
     * no puede pasar es que aparezca un enlace vacío en el camino.
     */
    const code = leerCodigo('components/landing/landing-footer.tsx');
    expect(code).not.toMatch(/href=["']#["']/);
    expect(code).not.toMatch(/href=["']\/privacidad/);
    expect(code).not.toMatch(/href=["']\/terminos/);

    // Y los textos siguen estando: la decisión es no enlazarlos, no esconderlos.
    for (const d of [es, en]) {
      expect(d.landing.footer.privacidad.trim()).not.toBe('');
      expect(d.landing.footer.terminos.trim()).not.toBe('');
      expect(d.landing.footer.datos.trim()).not.toBe('');
    }
  });
});

describe('el nav no promete secciones que no existen', () => {
  test('cada ancla del nav tiene su sección con ese id', () => {
    /*
     * El nav solo pinta las anclas que la página le pasa, y este test obliga a que las dos cosas
     * se muevan juntas: si alguien agrega la sección y olvida el ancla, el enlace nunca aparece;
     * si agrega el ancla sin la sección, el enlace no lleva a nada — y eso último no falla en
     * ninguna parte, solo deja un enlace del nav que no hace nada al apretarlo.
     */
    const page = leerCodigo('app/page.tsx');
    const anclas = page.match(/anclas=\{\[([\s\S]*?)\]\}/)?.[1] ?? null;
    expect(anclas).not.toBeNull();

    /*
     * Los `id` viven en los COMPONENTES de sección, no en la página: `id="como-funciona"` está
     * dentro de `SeccionComo`. La primera versión de este test los buscaba solo en `app/page.tsx`
     * y fallaba en cuanto las secciones existieron de verdad — buscaba en el archivo equivocado.
     */
    const marcado = [
      page,
      leerCodigo('components/landing/landing-secciones.tsx'),
      leerCodigo('components/landing/landing-acordeones.tsx'),
      leerCodigo('components/landing/landing-producto.tsx'),
    ].join('\n');

    for (const a of (anclas as string).split(',').map((x) => x.trim().replace(/['"]/g, ''))) {
      if (!a) continue;
      expect(marcado, `el ancla "${a}" necesita un id="${a}" en alguna sección`).toContain(
        `id="${a}"`,
      );
    }
  });
});

describe('el mockup del hero', () => {
  test('el PNG existe y no es enorme', () => {
    /*
     * Es una imagen de 2632px de ancho en la primera pantalla. Se sirve por `next/image`, que la
     * optimiza y la reescala, pero el archivo fuente igual viaja en el repo — un tope evita que
     * alguien lo reemplace por un export a 4x sin darse cuenta.
     */
    const p = join(raiz, 'public/landing/mockup-resumen.png');
    expect(existsSync(p)).toBe(true);
    expect(statSync(p).size).toBeLessThan(900 * 1024);
  });

  test('el `alt` DESCRIBE la imagen, no anuncia que existe', () => {
    /*
     * Es la única prueba visual del producto en la landing. Un `alt` vacío o un "captura del
     * panel" deja a quien usa lector de pantalla sin la información que la imagen aporta: qué
     * métricas muestra Macha.
     */
    for (const d of [es, en]) {
      expect(d.landing.hero.mockupAlt.length).toBeGreaterThan(40);
      expect(d.landing.hero.mockupAlt.toLowerCase()).not.toMatch(/^(imagen|image|captura)/);
    }
  });

  test('se sirve por `next/image` con prioridad', () => {
    // Sin `priority`, Next la carga en diferido y el hueco de la primera pantalla se ve.
    const code = leerCodigo('components/landing/landing-hero.tsx');
    expect(code).toContain('priority');
    expect(code).toContain("from 'next/image'");
  });
});

describe('la landing usa los tokens de tipografía medidos, no tamaños sueltos', () => {
  test('el titular del hero es `text-hero`, no un arbitrario', () => {
    /*
     * `text-[88px]` funcionaría en escritorio y desbordaría en un teléfono, porque un valor suelto
     * no trae el `clamp()`. El token sí. Ver la tabla de medición en `tailwind.config.ts`.
     *
     * ═══ POR QUÉ NO SE PROHÍBEN TODOS LOS TAMAÑOS SUELTOS ═══
     *
     * La primera versión de este test agregaba un `not.toMatch(/text-\[\d+px\]/)` y estaba MAL:
     * hacía fallar los botones, que usan `text-[17px]` con toda la razón. A 17px no hace falta
     * escalar — el titular a 88px sí, y esa es la única pieza donde un valor suelto rompe algo.
     *
     * Un test que prohíbe lo correcto es peor que no tenerlo: la salida obvia es relajarlo hasta
     * que deje de decir nada.
     */
    expect(leerCodigo('components/landing/landing-hero.tsx')).toContain('text-hero');
  });

  test('los tokens de landing escalan con clamp', () => {
    const cfg = leer('tailwind.config.ts');
    for (const t of ['hero', 'sectionbig', 'section', 'lead']) {
      const m = cfg.match(new RegExp(`\\n\\s+${t}: \\[\\n?\\s*'([^']+)'`));
      expect(m?.[1], `el token ${t}`).toContain('clamp(');
    }
  });
});

describe('las BANDAS de fondo — el reporte de "hay partes que tienen color negro"', () => {
  /*
   * ═══ QUÉ PROTEGE ESTE BLOQUE ═══
   *
   * La primera versión de la landing metía las catorce secciones en un contenedor de 1170px
   * separadas por `gap`, sin una sola banda de fondo. Se veía como un documento y le faltaba la
   * única sección que en el diseño cambia de tinta.
   *
   * Los tonos salen de MEDIR el frame del Figma (la tabla está en `banda.tsx`). Es un dato que no
   * se puede deducir del código ni recuperar sin volver a la API de Figma, así que vive acá.
   */
  const TONOS_MEDIDOS = [
    'lienzo', // hero
    'sutil', // por qué existe        #F9F9F9
    'lienzo', // cómo funciona
    'sutil', // el producto           #F9F9F9
    'lienzo', // capacidades
    'tinta', // el asesor con IA      #191919
    'lienzo', // automatización
    'sutil', // antes y después       #F9F9F9
    'lienzo', // seguridad
    'sutil', // planes                #F9F9F9
    'lienzo', // preguntas frecuentes
    'sutil', // formulario de demo    #F9F9F9
  ];

  /** Los tonos en el orden en que la página los monta. `<Banda>` sin `tono` es `lienzo`. */
  function tonosDeLaPagina(): string[] {
    const code = leerCodigo('app/page.tsx');
    return [...code.matchAll(/<Banda\b([^>]*)>/g)].map(
      (m) => m[1]!.match(/tono="([a-z]+)"/)?.[1] ?? 'lienzo',
    );
  }

  test('la secuencia de fondos es la que se midió en el Figma', () => {
    expect(tonosDeLaPagina()).toEqual(TONOS_MEDIDOS);
  });

  test('hay EXACTAMENTE una banda oscura', () => {
    /*
     * Una sola, y es la del asesor. Dos secciones oscuras romperían el ritmo alternado que hace
     * legible la página y gastarían el énfasis que esa sección tiene por ser la única.
     */
    expect(tonosDeLaPagina().filter((t) => t === 'tinta')).toHaveLength(1);
  });

  test('el tono oscuro se consigue con `.tinta`, no con un color a mano ni con `.inverse`', () => {
    /*
     * La clase redefine la paleta hacia adentro, así que los componentes de la sección siguen
     * usando `text-foreground` sin saber que están sobre negro. Un `bg-[#191919]` pintaría el fondo
     * y dejaría el texto en tinta oscura sobre tinta oscura.
     *
     * Y tiene que ser `.tinta`, NO `.inverse`. Esto no es preferencia de nombres: `.inverse` es
     * para la barra de organización del admin y define `--border` IGUAL a la superficie, además de
     * no tocar `--fill`. La primera versión de esta banda la usó y el resultado fue el panel y los
     * chips sin borde visible, y el chip activo blanco sobre blanco. Ver el comentario de `.tinta`
     * en `globals.css`.
     */
    const banda = leerCodigo('components/landing/banda.tsx');
    expect(banda).toMatch(/tono === 'tinta' \? 'tinta'/);
    expect(banda).not.toMatch(/'inverse /);
    expect(banda).toContain('bg-muted');
    // El fondo lo pinta `.tinta` en CSS, no `bg-card` — esa utilidad fue la que falló en prod.
    expect(banda).not.toMatch(/tinta bg-card/);
  });

  test('la isla oscura no tiene colisiones de token', () => {
    /*
     * ═══ EL BUG QUE ESTE TEST HABRÍA ATRAPADO ═══
     *
     * Con `.inverse`, dentro de la banda oscura pasaban dos cosas y ninguna lanzaba un error:
     * `--border` valía lo mismo que `--surface` (bordes invisibles) y `--fill` se quedaba en el
     * valor CLARO mientras `--ink` pasaba a blanco (chip activo blanco sobre blanco).
     *
     * Las dos son colisiones entre pares de tokens que SIEMPRE tienen que diferir en una
     * superficie con hijos delineados, y las dos se pueden comprobar leyendo el CSS. Lo que no se
     * puede comprobar así es el contraste fino; para eso hace falta mirar. Esto cubre el caso
     * grosero, que es el que se cuela.
     */
    const css = leer('styles/globals.css');
    const bloque = css.match(/\n\.tinta \{([\s\S]*?)\n\}/)?.[1];
    expect(bloque, 'falta el bloque .tinta en globals.css').toBeTruthy();

    const val = (nombre: string) =>
      bloque!.match(new RegExp(`--${nombre}:\\s*([^;]+);`))?.[1]?.trim();

    // Cada primitiva que la banda usa tiene que estar DEFINIDA en la isla: si falta, hereda el
    // valor claro del `:root` y ahí nacen los dos fallos de arriba.
    for (const t of ['surface', 'ink', 'muted', 'faint', 'border', 'border-strong', 'fill']) {
      expect(val(t), `.tinta no define --${t}`).toBeTruthy();
    }

    // Semánticos re-anclados: sin esto `bg-card` / `text-foreground` pueden seguir leyendo el
    // tema claro del ancestro y la banda se ve blanca.
    for (const t of ['card', 'foreground', 'background', 'muted-foreground']) {
      expect(val(t), `.tinta no define --${t}`).toBeTruthy();
    }

    // Fondo propio en la clase — no depende de una utilidad de Tailwind.
    expect(bloque).toMatch(/background-color:\s*var\(--surface\)/);

    // El borde tiene que verse contra su fondo.
    expect(val('border')).not.toBe(val('surface'));
    // El relleno del chip activo tiene que verse contra el texto que lleva encima.
    expect(val('fill')).not.toBe(val('ink'));
    // Y contra el fondo de la banda, o el chip activo no se distingue del resto.
    expect(val('fill')).not.toBe(val('surface'));
  });

  test('ningún componente de la landing escribe un color literal', () => {
    /*
     * Los hex medidos del Figma (#F9F9F9, #191919) están en los COMENTARIOS de `banda.tsx` como
     * registro de la medición — de ahí que se lea el código sin comentarios. Lo que no puede
     * aparecer es un hex en una clase: no tiene contraparte en tema oscuro, y el visitante que
     * tiene el sistema en oscuro vería un bloque blanco donde va una banda gris.
     */
    for (const f of [
      'banda.tsx',
      'landing-nav.tsx',
      'landing-nav-mobile.tsx',
      'landing-hero.tsx',
      'landing-secciones.tsx',
      'landing-acordeones.tsx',
      'landing-asesor.tsx',
      'landing-producto.tsx',
      'landing-formulario.tsx',
      'landing-footer.tsx',
    ]) {
      expect(leerCodigo(`components/landing/${f}`), f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  test('el nav va FIJO, que es lo que hace que su fondo translúcido signifique algo', () => {
    /*
     * El diseño le da fondo blanco al 72 %: el contenido se ve pasar por detrás. Sobre una barra
     * que se va con el scroll ese efecto no se ve nunca, así que quitar el `sticky` no rompe nada
     * visible y deja el diseño a medias.
     *
     * Y el desenfoque tiene que traer su respaldo opaco: sin `backdrop-filter`, un blanco al 72 %
     * deja leer el texto de abajo A TRAVÉS de los enlaces del nav.
     */
    const nav = leerCodigo('components/landing/landing-nav.tsx');
    expect(nav).toContain('sticky');
    expect(nav).toContain('backdrop-blur');
    expect(nav).toMatch(/supports-\[not\(backdrop-filter/);
  });

  test('ningún ancestro del nav recorta con `hidden`, que es lo que lo despegaba', () => {
    /*
     * ═══ EL BUG QUE ESTE TEST EXISTE PARA QUE NO VUELVA (CU-868kv8aaa) ═══
     *
     * El test de arriba pasaba y la barra NO quedaba fija. Que el `sticky` esté escrito en el
     * componente no alcanza: `position: sticky` se pega contra su ancestro de scroll más
     * cercano, y el ancestro que lo rompía estaba en `app/page.tsx`, a catorce secciones de
     * distancia.
     *
     * `overflow-x: hidden` con `overflow-y` sin declarar no deja `visible` en el otro eje: la
     * especificación lo computa a `auto`, y con eso el div es un contenedor de scroll aunque
     * nunca muestre una barra. `clip` recorta lo mismo y está exento de esa regla.
     *
     * Se afirma sobre los ancestros REALES del nav (la raíz de la página), no sobre la landing
     * entera: `banda.tsx` usa `overflow-hidden` a propósito y está DEBAJO del nav, no arriba.
     */
    const raizDePagina = leerCodigo('app/page.tsx').split('<LandingNav')[0];
    expect(raizDePagina).not.toMatch(/overflow-x-hidden|overflow-hidden|overflow-y-/);
    expect(raizDePagina).toContain('overflow-x-clip');
  });

  test('el fondo de la barra es un token que EXISTE — `bg-canvas` no pintaba nada', () => {
    /*
     * ═══ EL SEGUNDO BUG DE LA MISMA BARRA, Y NO SE VEÍA EN EL REPO ═══
     *
     * La barra decía `bg-canvas/[0.72]` y su `backgroundColor` computado era
     * `rgba(0, 0, 0, 0)`: transparente. Dos causas encadenadas, ninguna de las cuales falla
     * de forma visible en el código:
     *
     *   · `canvas` NUNCA estuvo en `colors` de `tailwind.config.ts` — solo existe como
     *     variable CSS en `globals.css` —, así que la clase no se generaba;
     *   · y aunque se generara, el modificador de opacidad sobre un color declarado
     *     `var(--x)` con un HEX adentro emite `rgb(var(--canvas) / .72)`, que es inválido y
     *     el navegador descarta la declaración entera.
     *
     * El efecto: desenfoque SIN velo. El contenido pasaba por detrás borroso en vez de
     * atenuado, que se lee peor que no tener el efecto.
     *
     * Por eso el token trae su alfa adentro (`--glass`) en vez de aplicarse con `/[0.72]`.
     */
    const nav = leerCodigo('components/landing/landing-nav.tsx');
    expect(nav).not.toMatch(/bg-canvas/);

    // Todo `bg-<token>` de la barra tiene que estar declarado en el config de Tailwind.
    const cfg = leer('tailwind.config.ts');
    for (const m of nav.matchAll(/\bbg-([a-z][a-z-]*)\b/g)) {
      const token = m[1]!;
      expect(cfg, `bg-${token} no existe en tailwind.config.ts`).toMatch(
        new RegExp(`\\b${token}: `),
      );
    }

    // Y `--glass` tiene que estar en los TRES ámbitos de tema, o la barra se pone blanca
    // sobre el lienzo oscuro.
    const css = leer('styles/globals.css');
    expect(css.match(/--glass:/g)?.length, '--glass en :root, .dark y .tinta').toBe(3);
  });
});

describe('el menú de secciones en móvil (CU-868kv8m1v)', () => {
  const movil = leerCodigo('components/landing/landing-nav-mobile.tsx');
  const nav = leerCodigo('components/landing/landing-nav.tsx');

  test('es un `<details>` nativo y no un desplegable con estado', () => {
    /*
     * El archivo del nav documentaba por qué NO había menú en móvil: un desplegable es "un
     * componente con estado, foco y trampa de teclado". El criterio de producto cambió (Jose),
     * el costo no — así que abrir, cerrar, Enter/Espacio y el foco los pone el navegador.
     *
     * El único JavaScript propio es cerrar al tocar un enlace, y ni siquiera es estado de
     * React: se le quita el atributo `open` al `<details>`, que es quien de verdad lo tiene.
     */
    expect(movil).toContain('<details');
    expect(movil).toContain('<summary');
    expect(movil).not.toMatch(/useState|useEffect|useRef/);
    // Cerrar al tocar: sin esto el panel tapa justo la sección a la que se acaba de saltar.
    expect(movil).toMatch(/removeAttribute\('open'\)/);
  });

  test('el disparador tiene nombre accesible y sale del diccionario', () => {
    // Un ícono de hamburguesa a secas no le dice nada a un lector de pantalla.
    expect(movil).toMatch(/aria-label=\{etiqueta\}/);
    expect(nav).toMatch(/etiqueta=\{labels\.nav\.menu\}/);
    for (const d of [es, en]) expect(d.landing.nav.menu.trim()).not.toBe('');
  });

  test('NO mantiene su propia lista de enlaces', () => {
    /*
     * Dos listas en dos archivos se desincronizan en el primer cambio, y el síntoma sería un
     * enlace que en móvil no lleva a ninguna parte: no falla en ningún test, solo no hace nada
     * al apretarlo. Los recibe ya filtrados por las anclas que la página declara.
     */
    expect(movil).not.toMatch(/labels\.nav|ANCLA_DEMO|#como-funciona|#planes|#faq/);
    expect(movil).toMatch(/enlaces\.map/);
  });

  test('solo aparece por debajo de `md`, y el CTA queda FUERA', () => {
    // El CTA de demo es la acción principal del diseño: visible siempre, abierto o no el menú.
    expect(movil).toMatch(/md:hidden/);
    const dentroDelMenu = movil.slice(movil.indexOf('<details'));
    expect(dentroDelMenu).not.toMatch(/bg-primary/);
    expect(nav).toMatch(/bg-primary/);
  });

  test('en el teléfono el lockup se reduce al isotipo, o la barra desborda', () => {
    /*
     * Medido con la landing corriendo, a 375px: nombre escrito (134) + idioma (57) + CTA (125)
     * + disparador (36) + huecos + relleno = 424px. La fila desbordaba, y como la raíz recorta
     * el eje horizontal (ver el test del nav fijo), desbordaba EN SILENCIO: el CTA se salía de
     * la pantalla sin que nada fallara.
     *
     * De lo que hay en la fila, el nombre escrito es lo único con un sustituto que dice lo
     * mismo. No contradice "el nombre completo no se abrevia": no se abrevia donde entra.
     */
    expect(nav).toMatch(/hidden sm:inline">\s*Macha Finance/);
    expect(nav).toMatch(/px-4 sm:gap-4 sm:px-6/);
  });
});

describe('el asesor es un selector, no tres respuestas apiladas', () => {
  test('es un tablist con flechas de teclado', () => {
    /*
     * Lo había construido mostrando las tres preguntas con su respuesta a la vez. El diseño son
     * tres chips y UN panel — y cuál chip está activo es una de las tres cosas que varían entre
     * los 16 frames del Figma, o sea que los frames están especificando justamente ese estado.
     *
     * Tres botones que cambian un panel es el patrón de pestañas, y si se anuncia como pestañas
     * hay que darle las flechas: media implementación es peor que ninguna, porque el lector de
     * pantalla dice "pestaña 1 de 3" —le indica al usuario que use las flechas— y entonces las
     * flechas tienen que responder.
     */
    const code = leerCodigo('components/landing/landing-asesor.tsx');
    expect(code).toContain('role="tablist"');
    expect(code).toContain('role="tab"');
    expect(code).toContain('role="tabpanel"');
    expect(code).toContain('aria-selected');
    expect(code).toContain('ArrowRight');
    expect(code).toContain('ArrowLeft');
    // El foco tiene que seguir a la selección, o la flecha siguiente se mueve desde donde quedó
    // el foco y el recorrido se vuelve impredecible.
    expect(code).toContain('.focus()');
  });
});

describe('la escala tipográfica es la MEDIDA del Figma', () => {
  /*
   * ═══ POR QUÉ ESTE BLOQUE EXISTE ═══
   *
   * Keneth pidió que la landing quedara idéntica al Figma. Extraje de la API el tamaño, el peso y
   * el tracking de los 201 nodos de texto del frame, y el resultado descubrió un error de fondo:
   * yo había construido la landing con los tokens del PRODUCTO, que no coinciden. `micro` vale
   * 10px y el diseño usa 12, 13, 14 o 15 según el rol — o sea que TODO el texto secundario de la
   * landing estaba entre un 20 % y un 50 % más chico de lo diseñado.
   *
   * Es un fallo que no rompe nada y que solo se ve comparando con el diseño al lado. Por eso los
   * valores medidos viven en un test y no en un comentario: un comentario ya falló antes en este
   * repo (la nota de `pagetitle`, que el dashboard siguió ignorando cinco semanas).
   */
  const MEDIDO: Record<string, { px: string; peso?: string; tracking?: string }> = {
    leyebrow: { px: '12px', peso: '600', tracking: '0.14em' },
    lnum: { px: '14px', peso: '300', tracking: '0.14em' },
    lhero: { px: '22px', peso: '300' },
    lsub: { px: '17px', peso: '300' },
    lprose: { px: '15px', peso: '300' },
    lstrong: { px: '15px', peso: '600' },
    lrow: { px: '14px', peso: '300' },
    lstage: { px: '14px', peso: '600' },
    lsmall: { px: '13px', peso: '300' },
    lcard: { px: '13px', peso: '600' },
    lmeta: { px: '12px', peso: '300' },
    lchip: { px: '12px', peso: '600' },
    lline: { px: '26px' },
    lanswer: { px: '21px', peso: '300' },
  };

  const cfg = leer('tailwind.config.ts');

  test('cada token de la landing vale lo que se midió', () => {
    for (const [token, esperado] of Object.entries(MEDIDO)) {
      const m = cfg.match(new RegExp(`\\n\\s+${token}: \\['([^']+)'(?:, \\{([^}]*)\\})?`));
      expect(m, `falta el token ${token}`).toBeTruthy();
      expect(m![1], `${token}: tamaño`).toBe(esperado.px);
      const opciones = m![2] ?? '';
      if (esperado.peso)
        expect(opciones, `${token}: peso`).toContain(`fontWeight: '${esperado.peso}'`);
      if (esperado.tracking)
        expect(opciones, `${token}: tracking`).toContain(`letterSpacing: '${esperado.tracking}'`);
    }
  });

  test('los tokens del PRODUCTO no se usan en la landing', () => {
    /*
     * `micro`, `eyebrow`, `body` y `lead` están medidos contra el prototipo de Lovable y tienen sus
     * propios tests. Usarlos acá fue el error original, y "arreglarlos" para que sirvan a la
     * landing rompería el dashboard. Son dos superficies con dos escalas.
     *
     * `lead` entra en la lista por un motivo aparte: es un `clamp()` que llega a 22px en pantallas
     * anchas. La bajada de SECCIÓN del diseño mide 17px fijos, así que en un monitor grande crecía
     * un 29 % sobre lo diseñado sin que nada avisara.
     */
    for (const f of [
      'landing-nav.tsx',
      'landing-hero.tsx',
      'landing-secciones.tsx',
      'landing-acordeones.tsx',
      'landing-asesor.tsx',
      'landing-producto.tsx',
      'landing-formulario.tsx',
      'landing-footer.tsx',
    ]) {
      const code = leerCodigo(`components/landing/${f}`);
      expect(code, f).not.toMatch(/text-(micro|eyebrow|body|lead|caption|delta)\b/);
    }
  });

  test('en la landing el eyebrow NO va en monoespaciada', () => {
    /*
     * ═══ EXCEPCIÓN DELIBERADA A LA REGLA DEL PRODUCTO, Y ACOTADA A ESTA PÁGINA ═══
     *
     * La regla del proyecto dice que `font-mono` es obligatorio para eyebrows y labels en mayúscula
     * con tracking, porque son rasgo de identidad. Vale para el producto.
     *
     * El Figma de la landing usa UNA SOLA familia en sus 201 nodos de texto —Geist, ni una
     * monoespaciada— y sus eyebrows son 12px/600 con +0.14em de tracking. Poner mono acá haría que
     * el rasgo más repetido de la página (14 eyebrows) fuera lo único que no coincide con el
     * diseño que Keneth pidió replicar.
     *
     * La excepción es de la landing y nada más: si alguien copia un eyebrow de acá a una pantalla
     * del producto, ahí sí lleva mono.
     */
    for (const f of [
      'landing-nav.tsx',
      'landing-hero.tsx',
      'landing-secciones.tsx',
      'landing-acordeones.tsx',
      'landing-asesor.tsx',
      'landing-producto.tsx',
      'landing-formulario.tsx',
      'landing-footer.tsx',
    ]) {
      expect(leerCodigo(`components/landing/${f}`), f).not.toContain('font-mono');
    }
  });

  test('solo los TITULARES escalan con la ventana', () => {
    /*
     * `hero` (88px), `sectionbig` (68) y `section` (52) llevan `clamp()` porque no entran en 375px
     * de ancho. La prosa NO: entre 12 y 26px nada desborda un teléfono, y escalar el cuerpo con la
     * ventana lo deja ilegible en un extremo o gigante en el otro.
     */
    for (const t of ['hero', 'sectionbig', 'section']) {
      const m = cfg.match(new RegExp(`\\n\\s+${t}: \\[\\n?\\s*'([^']+)'`));
      expect(m?.[1], `el titular ${t}`).toContain('clamp(');
    }
    for (const t of Object.keys(MEDIDO)) {
      const m = cfg.match(new RegExp(`\\n\\s+${t}: \\['([^']+)'`));
      expect(m?.[1], `${t} no debería escalar`).not.toContain('clamp(');
    }
  });
});

describe('responsive', () => {
  const ARCHIVOS = [
    'landing-nav.tsx',
    'landing-nav-mobile.tsx',
    'landing-hero.tsx',
    'landing-secciones.tsx',
    'landing-acordeones.tsx',
    'landing-asesor.tsx',
    'landing-producto.tsx',
    'landing-formulario.tsx',
    'landing-footer.tsx',
    'banda.tsx',
  ];

  test('la landing NO usa el breakpoint `app:` (1080px)', () => {
    /*
     * ═══ EL FALLO QUE ESTO EVITA, Y NO ES OBVIO ═══
     *
     * `app` vale 1080px y existe para el DASHBOARD: es el ancho a partir del cual entra el shell
     * con su sidebar y su rail. La primera versión de la landing lo usó para todos sus cortes de
     * columna, y la consecuencia es que TODO lo que mide entre 640 y 1080 —una tablet en
     * horizontal, un MacBook Air de 1440 lógicos a media pantalla, un laptop de 1024— veía la
     * landing entera en UNA COLUMNA.
     *
     * No se ve como un bug: se ve como una landing pobre. Y no lo detecta ningún test que mire
     * "hay grid-cols-1 de respaldo", porque el respaldo estaba y era justamente el problema.
     *
     * Los cortes ahora son los de Tailwind y se eligen por CONTENIDO: `md` (768) cuando al lado
     * hay texto, `lg` (1024) cuando al lado hay una tarjeta de datos que necesita ancho para no
     * romper sus columnas.
     */
    for (const f of ARCHIVOS) {
      expect(leerCodigo(`components/landing/${f}`), f).not.toMatch(/\bapp:/);
    }
    expect(leerCodigo('app/page.tsx')).not.toMatch(/\bapp:/);
  });

  test('toda rejilla tiene columnas base antes de su breakpoint', () => {
    /*
     * Un `md:grid-cols-3` sin `grid-cols-1` de base hereda el default de `grid`, que es una sola
     * columna implícita — funciona por accidente. Y si alguien escribe `md:grid-cols-3` sobre un
     * contenedor que ya tenía `grid-cols-2`, el móvil se queda en dos columnas sin que se note en
     * escritorio. Exigir la base explícita es lo que hace que el móvil sea una decisión.
     */
    for (const f of ARCHIVOS) {
      const code = leerCodigo(`components/landing/${f}`);
      for (const m of code.matchAll(/className=(?:"|\{`)([^"`]*grid-cols[^"`]*)(?:"|`\})/g)) {
        const clases = m[1]!;
        if (!/\b(md|lg|sm|xl):grid-cols/.test(clases)) continue;
        expect(clases, `${f}: rejilla sin columnas base -> ${clases}`).toMatch(/(^|\s)grid-cols-/);
      }
    }
  });

  test('la banda recorta lo que se sale, o la página gana scroll horizontal', () => {
    /*
     * Tres secciones llevan la mancha de marca posicionada fuera de su caja a propósito
     * (`-left-48`, `-top-52`, `-right-40`). Sin recorte esos negativos son ancho de página: la del
     * cierre mide 420px centrada, así que en un teléfono de 375px sobresale ~22px por lado y el
     * documento entero gana barra horizontal.
     *
     * Y el síntoma no aparece donde está la causa: una barra al pie se lee como "la landing está
     * corrida" en cualquier sección.
     */
    expect(leerCodigo('components/landing/banda.tsx')).toMatch(/overflow-hidden/);
  });

  test('las capturas del producto son fluidas', () => {
    /*
     * Los dos mockups son PNG de 2632px de ancho intrínseco. Sin `w-full h-auto max-w-full`
     * empujan el ancho de la página en cualquier pantalla más chica. `min-w-0` en el contenedor
     * evita que un padre flex ignore el tope; `sizes` evita servir el 2x a un teléfono.
     */
    for (const f of ['landing-hero.tsx', 'landing-producto.tsx']) {
      const code = leerCodigo(`components/landing/${f}`);
      expect(code, f).toContain('h-auto w-full max-w-full');
      expect(code, f).toContain('min-w-0');
      expect(code, f).toMatch(/sizes=/);
    }
  });

  test('el formulario de contacto es compacto, no una tarjeta de app', () => {
    const code = leerCodigo('components/landing/landing-formulario.tsx');
    // Sin caja con borde/sombra: eso era lo que se leía "de ahuevo" contra el Figma.
    expect(code).not.toMatch(/shadow-sm/);
    expect(code).not.toMatch(/Textarea/);
    expect(code).not.toMatch(/InsightPoint/);
    // El honeypot no puede ir a left:-9999px: empuja el scroll horizontal en móvil.
    expect(code).not.toMatch(/-left-\[9999px\]/);
    expect(code).toMatch(/sr-only/);
  });

  test('la landing no usa ShowcaseFrame', () => {
    /*
     * ShowcaseFrame es para pantallas cortas de vitrina. En la landing metía manchas ambient
     * a escala de página y competía con las bandas (incluida la oscura).
     */
    expect(leerCodigo('app/page.tsx')).not.toMatch(/ShowcaseFrame/);
  });

  test('nada de la landing fija un ancho mayor que un teléfono', () => {
    /*
     * Un `w-[420px]` o un `min-w-[600px]` desborda un móvil. Se permiten dos casos y solo dos:
     * `max-w-*` (que es un TOPE, no un ancho) y las manchas de marca, que son decorativas y viven
     * recortadas por la banda — el test de arriba es el que garantiza el recorte.
     */
    for (const f of ARCHIVOS) {
      const code = leerCodigo(`components/landing/${f}`);
      for (const m of code.matchAll(/(?<!max-)\b(min-)?w-\[(\d+)px\]/g)) {
        const px = Number(m[2]);
        if (px <= 360) continue;
        // Las manchas de marca son las únicas excepciones, y se reconocen por venir con su alto.
        const esMancha = code.includes(`h-[${px}px] w-[${px}px]`);
        expect(esMancha, `${f}: ancho fijo de ${px}px que no es una mancha decorativa`).toBe(true);
      }
    }
  });
});
