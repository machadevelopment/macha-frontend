import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868krmrcj fase C — el paso de configuración de archivos.
 *
 * Lo que se protege acá NO es el render: es un par de decisiones que se pueden deshacer sin
 * que nada falle, y que si se deshacen dejan el ticket a medias en silencio.
 */

const raiz = join(import.meta.dir, '..', '..');
const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

describe('el alta lleva al onboarding, no directo al panel', () => {
  test('el wizard redirige a /onboarding cuando no hay checkout', () => {
    /*
     * Es una sola línea y es todo el enganche del flujo sin cobro. Si alguien la devuelve a
     * `/dashboard`, la pantalla de onboarding sigue existiendo, compila y se puede visitar a
     * mano — simplemente no la ve nadie nunca. Ese es el tipo de regresión que ningún otro
     * test atraparía.
     */
    const wizard = leer('components/register-wizard.tsx');
    expect(wizard).toContain("checkoutUrl ?? '/onboarding'");
    expect(wizard).not.toContain("checkoutUrl ?? '/dashboard'");
  });

  test('la pantalla vive FUERA del grupo (app)', () => {
    // Dentro de `(app)` heredaría el sidebar con seis pantallas vacías, que es el primer
    // contacto con el producto que la vitrina existe para evitar.
    expect(() => leer('app/onboarding/page.tsx')).not.toThrow();
    expect(() => leer('app/(app)/onboarding/page.tsx')).toThrow();
  });

  test('reutiliza el dropzone de Carga de datos, no uno propio', () => {
    // Un dropzone propio sería una segunda superficie donde los topes y formatos se pueden
    // desincronizar de los del backend, y el cliente lo descubriría con un archivo real.
    expect(leer('components/onboarding/file-setup.tsx')).toContain(
      "from '@/components/upload/document-dropzone'",
    );
  });
});

describe('textos del onboarding', () => {
  test.each([
    ['es', es],
    ['en', en],
  ])('%s tiene los tres motivos y la salida de omitir', (_idioma, dict) => {
    const o = dict.onboarding;
    for (const campo of [o.why1, o.why2, o.why3, o.skip, o.skipHint]) {
      expect(campo.trim()).not.toBe('');
    }
  });

  test.each([
    ['es', es],
    ['en', en],
  ])('%s: omitir NO promete plantillas que todavía no existen', (_idioma, dict) => {
    /*
     * El ticket pedía que "Omitir por ahora" llevara a las plantillas descargables por
     * industria. Ese flujo NO existe y no tiene ticket abierto, así que el texto manda a
     * Carga de datos, que es un lugar real. Si alguien escribe "plantilla" acá antes de que
     * el flujo exista, el botón promete algo que no hay — y eso es peor que no ofrecerlo.
     */
    expect(dict.onboarding.skipHint.toLowerCase()).not.toContain('plantilla');
    expect(dict.onboarding.skipHint.toLowerCase()).not.toContain('template');
  });
});
