import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `/` devolvía 500 para TODO visitante sin sesión — la única ruta pública del producto y
 * la puerta de entrada de cualquiera.
 *
 * La causa: `app/page.tsx` hacía `<a href={await getSignInUrl()}>`. Esa función parece
 * un getter puro pero por dentro es `getAuthURLAndSetPKCECookie`: **escribe** la cookie
 * con el `code_verifier` del intercambio PKCE. Next.js solo permite mutar cookies en
 * Server Actions y Route Handlers, así que desde el cuerpo de un Server Component
 * lanzaba `Cookies can only be modified in a Server Action or Route Handler`.
 *
 * Por qué merece una prueba y no solo el arreglo: typecheck, lint, los tests y `next
 * build` pasaban los cuatro en verde con `/` completamente rota. Solo se veía ejecutando
 * la app con WorkOS configurado de verdad — antes de eso el middleware fallaba primero y
 * la página ni siquiera se ejecutaba. Es exactamente el tipo de fallo que vuelve a
 * entrar sin que nada se queje.
 */

const appDir = import.meta.dir;

/** Todos los page.tsx/layout.tsx bajo app/ — los Server Components por defecto. */
function serverComponents(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      serverComponents(full, acc);
    } else if (/^(page|layout)\.tsx$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('entrada al login', () => {
  test('existe el Route Handler /login', () => {
    expect(existsSync(join(appDir, 'login', 'route.ts'))).toBe(true);
  });

  /**
   * CU-868kmr0j5: sin `onError`, `handleAuth` responde 500 ante CUALQUIER login que no
   * termine bien — incluido cancelar el acceso, que redirige aquí con
   * `?error=access_denied`. Verificado contra producción en los tres caminos.
   * El fallo no se ve en ningún test de render: `/callback` es un Route Handler y solo
   * falla con una petición real, así que se fija sobre el fuente.
   */
  test('/callback maneja el error en vez de devolver 500', () => {
    const src = readFileSync(join(appDir, 'callback', 'route.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toMatch(/onError\s*:/);
    expect(code).toMatch(/auth_error/);
  });

  /**
   * ═══ EL DESTINO DEL LOGIN NO PUEDE SER LA LANDING (2026-08-21) ═══
   *
   * `returnPathname` decía `/` mientras esa ruta cumplía dos papeles: portada pública Y
   * enrutador de post-login. Cuando `/` pasó a ser la landing, dejarlo en `/` habría producido
   * el peor fallo silencioso de todo el flujo: el usuario se autentica **correctamente**,
   * aterriza en la portada de marketing, y no pasa nada visible. Ni error, ni log, ni señal de
   * haber entrado — solo la sensación de que el login no funciona.
   *
   * No lo atraparía ningún otro test: `/callback` es un Route Handler generado por el SDK y
   * `/` renderizaría perfecto. Por eso se fija sobre el fuente, igual que el `onError`.
   *
   * El camino de ERROR sí va a `/` a propósito (`?auth_error=1`), y el test de arriba lo cubre:
   * quien no logró entrar no tiene nada que bifurcar y la portada es donde reintenta.
   */
  test('el login exitoso NO aterriza en la landing', () => {
    const src = readFileSync(join(appDir, 'callback', 'route.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const destino = code.match(/returnPathname:\s*'([^']*)'/)?.[1];
    expect(destino).toBeDefined();
    expect(destino).not.toBe('/');

    // Y el destino tiene que existir como ruta, o el login termina en un 404.
    expect(existsSync(join(appDir, destino!.replace(/^\//, ''), 'page.tsx'))).toBe(true);
  });

  test('el default de returnTo tampoco es la landing', () => {
    /*
     * El callback solo aplica `returnPathname: '/continue'` si la cookie PKCE NO trae
     * otro destino. `/login` sin `?returnTo` pasaba `returnTo: '/'` (vía destinoSeguro),
     * y ese valor GANABA: login correcto → portada de marketing. Fijamos el default acá
     * porque es el mismo fallo silencioso, por otra puerta.
     */
    const src = readFileSync(join(appDir, '..', 'lib', 'auth', 'return-to.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toMatch(/DESPUES_DEL_LOGIN\s*=\s*'\/continue'/);
    expect(code).not.toMatch(/const RAIZ\s*=\s*'\/'/);
  });

  test('/login es público en el middleware — si no, quien no ha entrado no puede entrar', () => {
    const mw = readFileSync(join(appDir, '..', 'middleware.ts'), 'utf8');
    const paths = mw.match(/unauthenticatedPaths:\s*\[([^\]]*)\]/)?.[1] ?? '';
    expect(paths).toContain("'/login'");
    expect(paths).toContain("'/callback'");
  });

  test.each(serverComponents(appDir).map((f) => [f.slice(appDir.length + 1), f]))(
    'app/%s no llama a getSignInUrl/getSignUpUrl (escriben cookie PKCE)',
    (_label, full) => {
      const src = readFileSync(full as string, 'utf8');
      // Sin comentarios: el arreglo deja escrito el nombre en una nota explicativa.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(code).not.toMatch(/\bgetSignInUrl\s*\(/);
      expect(code).not.toMatch(/\bgetSignUpUrl\s*\(/);
    },
  );
});
