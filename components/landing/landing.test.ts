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
