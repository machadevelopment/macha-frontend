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

describe('el CTA de demo lleva a un contacto que existe', () => {
  test('apunta al correo que dio Keneth', () => {
    // Si alguien lo cambia por un `#` o por una ruta que no existe, el único camino de conversión
    // de la landing deja de funcionar sin que nada falle.
    expect(leer('components/landing/demo-link.ts')).toContain('contact@machafinance.com');
  });

  test('el asunto va prellenado y CODIFICADO', () => {
    /*
     * El asunto lleva espacios y acentos. Sin `encodeURIComponent` el `mailto` se corta en el
     * primer espacio en varios clientes de correo: el enlace "funciona" y llega un correo con
     * asunto vacío o truncado.
     */
    const code = leerCodigo('components/landing/demo-link.ts');
    expect(code).toContain('encodeURIComponent(asunto)');
    for (const d of [es, en]) expect(d.landing.demoAsunto.trim()).not.toBe('');
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
    'sutil', // cierre                #F9F9F9
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

  test('el tono oscuro se consigue con `.inverse`, no con un color a mano', () => {
    /*
     * `.inverse` redefine `--surface`/`--ink`/`--border` hacia adentro, así que los componentes de
     * la sección siguen usando `text-foreground` sin saber que están sobre negro. Un `bg-[#191919]`
     * pintaría el fondo y dejaría el texto en tinta oscura sobre tinta oscura.
     */
    const banda = leerCodigo('components/landing/banda.tsx');
    expect(banda).toContain('inverse');
    expect(banda).toContain('bg-muted');
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
      'landing-hero.tsx',
      'landing-secciones.tsx',
      'landing-acordeones.tsx',
      'landing-asesor.tsx',
      'landing-producto.tsx',
      'landing-cta.tsx',
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
