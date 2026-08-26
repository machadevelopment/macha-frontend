import { afterEach, describe, expect, test } from 'bun:test';
import { origenCanonico, urlCanonica } from './canonical-origin';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL DESTINO DE SALIDA TIENE QUE SER UNA URL ABSOLUTA (reporte de Jose, 2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `signOut({ returnTo: '/' })` mandaba `return_to=%2F` a WorkOS, que no puede redirigir a una
 * ruta relativa porque no sabe de qué host. Caía a la URI de su dashboard —la de Vercel— y el
 * usuario terminaba en `macha-finance.vercel.app` después de cerrar sesión.
 *
 * Este test no comprueba el logout: comprueba lo único comprobable desde acá, que es que el
 * destino sea absoluto y esté sobre el mismo dominio que el login. Que WorkOS lo acepte depende
 * de su lista de redirects, que es de dashboard y no de código.
 */
describe('origen canónico', () => {
  const original = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
    else process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = original;
  });

  test('sale del mismo valor que usa el login', () => {
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = 'https://macha.finance/callback';
    expect(origenCanonico()).toBe('https://macha.finance');
  });

  /*
   * El destino tiene que ser ABSOLUTO. Un `/` suelto es lo que produjo el bug, así que el test
   * afirma la propiedad —tiene esquema y host— y no una cadena concreta: el día que el dominio
   * cambie, esto sigue siendo la regla correcta.
   */
  test('el destino de salida es absoluto', () => {
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = 'https://macha.finance/callback';
    const destino = urlCanonica('/');
    expect(destino.startsWith('https://')).toBe(true);
    expect(new URL(destino).host).toBe('macha.finance');
    expect(destino).not.toBe('/');
  });

  test('nunca apunta a un dominio de Vercel si la variable es la correcta', () => {
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = 'https://macha.finance/callback';
    expect(urlCanonica('/')).not.toContain('vercel.app');
  });

  /*
   * No lanza nunca: un logout que explota por una variable mal puesta deja al usuario con la
   * sesión a medio cerrar, que es peor que mandarlo al dominio de producción.
   */
  test('sin la variable cae al dominio de producción en vez de fallar', () => {
    delete process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
    expect(origenCanonico()).toBe('https://macha.finance');
    expect(() => urlCanonica('/')).not.toThrow();
  });

  test('con una variable mal formada tampoco falla', () => {
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = 'no-es-una-url';
    expect(origenCanonico()).toBe('https://macha.finance');
  });

  test('resuelve rutas con y sin barra inicial', () => {
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI = 'https://macha.finance/callback';
    expect(urlCanonica('/settings')).toBe('https://macha.finance/settings');
    expect(urlCanonica('settings')).toBe('https://macha.finance/settings');
  });
});
