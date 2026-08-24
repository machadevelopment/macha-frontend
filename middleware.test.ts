import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL MATCHER DEL MIDDLEWARE, EVALUADO — no leído
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Este archivo existe porque el mismo defecto entró CUATRO veces por la misma línea, y las
 * cuatro con todo el gate en verde: el favicon (`icon.svg`), el logo de los correos
 * (`brand/`), los mockups de la portada (`landing/`) y —2026-08-24— el formulario de demo
 * (`api/public/`), que es el único camino de conversión del producto.
 *
 * ═══ POR QUÉ NO ALCANZABA LO QUE YA HABÍA ═══
 *
 * `next.config.test.ts` ya afirma cosas sobre el matcher, pero las afirma sobre el TEXTO
 * (`expect(middleware).toMatch(/matcher:[\s\S]*monitoring/)`). Eso prueba que una palabra
 * aparece, no que una URL quede fuera. No habría atrapado ninguno de los cuatro casos: en
 * todos, la palabra que faltaba faltaba justamente porque nadie la había escrito.
 *
 * Y hay un modo de fallo que un test de texto NO puede ver ni en principio: `api/public` sin
 * barra final también excluía `/api/publicidad` —o cualquier ruta futura que EMPIECE con
 * "public"— por choque de prefijos en el negative-lookahead. La palabra está, el texto pasa,
 * y una ruta que debía llevar sesión queda abierta. Solo se ve ejecutando el regex.
 *
 * Por eso acá el matcher se COMPILA y se corre contra rutas de verdad.
 *
 * ═══ POR QUÉ LAS RUTAS PÚBLICAS SALEN DEL DISCO ═══
 *
 * La lista de rutas a verificar no está escrita a mano: se recorre `app/api/public/`. Un BFF
 * público nuevo queda cubierto por el solo hecho de existir, que es exactamente lo que falló
 * con `/api/public/demo-requests` — `bff-contract.test.ts` YA lo declaraba público en
 * `RUTAS_PUBLICAS`, con su justificación escrita, y aun así el middleware le exigía sesión.
 * El contrato estaba declarado en un lado y contradicho en otro, sin que nada los cruzara.
 *
 * ═══ SE LEE EL FUENTE, NO SE IMPORTA ═══
 *
 * Importar `middleware.ts` ejecuta `authkitProxy`, que exige las variables de WorkOS. Este es
 * un test de configuración; no debe convertirse en un test de entorno. Mismo criterio que
 * `next.config.test.ts`.
 */

const raiz = import.meta.dir;
const fuente = readFileSync(join(raiz, 'middleware.ts'), 'utf8');

/**
 * Los patrones de `config.matcher`, compilados. La sintaxis de matcher de Next es
 * path-to-regexp, pero el nuestro es un negative-lookahead de regex plano: se ancla y se
 * compila tal cual. Si algún día deja de serlo, este parseo falla ruidosamente en vez de
 * dar por buena una exclusión que no existe.
 */
function matchers(): RegExp[] {
  const bloque = fuente.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1];
  if (!bloque) throw new Error('no se encontró `matcher:` en middleware.ts');

  const patrones = [...bloque.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
  if (patrones.length === 0) throw new Error('`matcher` está vacío');

  return patrones.map((p) => new RegExp(`^${p}$`));
}

/** ¿`authkitProxy` corre sobre esta ruta? (o sea: ¿exige sesión?) */
function pasaPorElMiddleware(ruta: string): boolean {
  return matchers().some((re) => re.test(ruta));
}

/** Cada `route.ts` bajo `app/api/public/`, como la URL que el navegador realmente pide. */
function rutasPublicasDelDisco(): string[] {
  const base = join(raiz, 'app', 'api', 'public');
  const urls: string[] = [];

  const recorrer = (dir: string, prefijo: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entrada.name);
      if (entrada.isDirectory()) recorrer(full, `${prefijo}/${entrada.name}`);
      else if (entrada.name === 'route.ts') urls.push(prefijo);
    }
  };

  recorrer(base, '/api/public');
  return urls;
}

describe('el middleware NO se interpone en los BFF públicos', () => {
  /*
   * El caso que originó todo esto. Va explícito y además del barrido: si alguien borrara o
   * renombrara el directorio, el barrido se quedaría sin rutas y pasaría vacío.
   */
  test('/api/public/demo-requests queda fuera del matcher', () => {
    expect(pasaPorElMiddleware('/api/public/demo-requests')).toBe(false);
  });

  test('TODA ruta bajo app/api/public/ queda fuera del matcher', () => {
    const rutas = rutasPublicasDelDisco();
    expect(rutas.length).toBeGreaterThan(0);

    for (const ruta of rutas) {
      expect({ ruta, exigeSesion: pasaPorElMiddleware(ruta) }).toEqual({
        ruta,
        exigeSesion: false,
      });
    }
  });

  /**
   * La barra final del prefijo. Sin ella, `api/public` tapaba también `/api/publicidad` y
   * cualquier futura `/api/publish…`: rutas que SÍ deben llevar sesión, abiertas por un
   * choque de nombres que nadie iría a buscar en el middleware.
   */
  test('la exclusión no se derrama a rutas que sólo COMPARTEN el prefijo', () => {
    expect(pasaPorElMiddleware('/api/publicidad')).toBe(true);
    expect(pasaPorElMiddleware('/api/publish')).toBe(true);
  });
});

describe('el middleware SÍ sigue protegiendo todo lo demás', () => {
  /*
   * La otra mitad, y la que importa de verdad: la forma más fácil de hacer pasar los tests de
   * arriba es ensanchar la exclusión a `api`, lo que dejaría sin sesión TODAS las BFF —las que
   * reenvían el Bearer y la cookie de empresa activa. Estas rutas son la prueba de que la
   * exclusión sigue siendo un namespace y no un agujero.
   */
  test.each([
    ['/dashboard'],
    ['/admin/demo-requests'],
    ['/api/memberships'],
    ['/api/documents'],
    ['/api/admin/demo-requests'],
  ])('%s pasa por el middleware', (ruta) => {
    expect(pasaPorElMiddleware(ruta)).toBe(true);
  });

  /*
   * `/` y `/login` pasan por el middleware A PROPÓSITO: no están excluidas del matcher sino
   * listadas en `unauthenticatedPaths`, que es distinto — el middleware corre y decide no
   * exigir sesión. Se fija acá para que nadie las "arregle" moviéndolas al matcher.
   */
  test('la landing y el login se resuelven con unauthenticatedPaths, no con el matcher', () => {
    expect(pasaPorElMiddleware('/')).toBe(true);
    expect(pasaPorElMiddleware('/login')).toBe(true);
    expect(fuente).toMatch(/unauthenticatedPaths:\s*\[[^\]]*'\/'/);
    expect(fuente).toMatch(/unauthenticatedPaths:\s*\[[^\]]*'\/login'/);
  });
});

describe('los estáticos que ya se rompieron una vez', () => {
  /*
   * Los tres casos anteriores del mismo defecto. `next.config.test.ts` los cubre por texto;
   * acá quedan cubiertos por la URL real que el cliente pide — que es lo que se rompió.
   */
  test.each([
    ['/icon.svg', 'el favicon de la pestaña'],
    ['/brand/isotipo.png', 'el logo de los correos, que pide un cliente de correo sin sesión'],
    ['/landing/mockup-dashboard.png', 'los mockups de la portada'],
    ['/monitoring', 'el túnel de ingesta de Sentry'],
  ])('%s queda fuera del matcher (%s)', (ruta) => {
    expect(pasaPorElMiddleware(ruta)).toBe(false);
  });
});
