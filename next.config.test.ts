import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

/**
 * CU-868kjc99f. Estas dos piezas de `next.config.mjs` son invisibles: si alguien las
 * quita, todo sigue compilando, el gate sigue verde y Sentry deja de reportar en
 * silencio. Es exactamente como llegó el repo a este ticket — el SDK instalado, los
 * tres `Sentry.init` escritos, y ni un evento saliendo.
 *
 * Se valida el TEXTO del archivo y no el objeto exportado a propósito: importarlo
 * ejecutaría el plugin de Sentry (que arrastra rollup y su binario nativo) dentro de
 * `bun test`, convirtiendo un test de configuración en un test de toolchain.
 */
const config = readFileSync(new URL('./next.config.mjs', import.meta.url), 'utf8');
const middleware = readFileSync(new URL('./middleware.ts', import.meta.url), 'utf8');

describe('next.config.mjs — wiring de Sentry (CU-868kjc99f)', () => {
  test('la config se exporta envuelta en withSentryConfig', () => {
    expect(config).toContain('withSentryConfig');
    expect(config).toMatch(/export default withSentryConfig\(/);
  });

  test('instrumentationHook está activo (en Next 14 sin esto register() nunca corre)', () => {
    expect(config).toMatch(/instrumentationHook:\s*true/);
  });

  test('los source maps se borran del output tras subirse (no quedan públicos)', () => {
    expect(config).toMatch(/deleteSourcemapsAfterUpload:\s*true/);
  });

  test('org/project/token salen del entorno, nunca del repo', () => {
    expect(config).toContain('process.env.SENTRY_ORG');
    expect(config).toContain('process.env.SENTRY_PROJECT');
    expect(config).toContain('process.env.SENTRY_AUTH_TOKEN');
    // Un DSN o un token literal en el archivo sería una credencial versionada.
    expect(config).not.toMatch(/sntrys_|https:\/\/[0-9a-f]{16,}@/);
  });
});

describe('tunnelRoute y middleware van juntos (CU-868kjc99f)', () => {
  /**
   * El túnel es una ruta del propio dominio. Si el matcher de `middleware.ts` la cubre,
   * `authkitProxy` le exige sesión y los errores de `/` —la única pantalla pública, y
   * donde falla justamente quien no logra entrar— se responden con un redirect al login
   * en vez de reportarse. Los dos valores tienen que coincidir.
   */
  const tunnel = config.match(/tunnelRoute:\s*'([^']+)'/)?.[1];

  test('tunnelRoute es una ruta fija (no `true`, que sería aleatoria por build)', () => {
    expect(tunnel).toBe('/monitoring');
  });

  test('esa misma ruta está excluida del matcher del middleware', () => {
    expect(tunnel).toBeDefined();
    expect(middleware).toContain(`${tunnel!.replace('/', '')}`);
    expect(middleware).toMatch(/matcher:\s*\['\/\(\(\?!.*monitoring.*\)\.\*\)'\]/);
  });
});

/**
 * El isotipo que va en los correos — el arreglo del logo roto que reportó Jose.
 *
 * Estos dos hechos son de la misma clase que los de Sentry: si alguien los deshace, el
 * build sigue verde, la app sigue funcionando y lo único que se rompe es una imagen
 * dentro de un correo ya enviado, que nadie de este lado vuelve a abrir.
 *
 * Se prueba el TEXTO por el mismo motivo que arriba (importar la config ejecuta el
 * plugin de Sentry), y por eso mismo no se puede probar la cabecera realmente servida.
 * Lo que sí queda fijado es que la intención esté escrita.
 */
describe('el isotipo de los correos se sirve como archivo público', () => {
  test('`brand` está FUERA del matcher del middleware', () => {
    /*
     * Es la mitad del arreglo que no se ve venir. Dentro del matcher, `authkitProxy`
     * responde 307 hacia WorkOS a quien pida el archivo — verificado contra producción
     * con `/icon.svg` — y un cliente de correo no sigue redirecciones para cargar una
     * imagen: pinta el `alt`. Que el archivo exista en `public/` no alcanza.
     */
    expect(middleware).toMatch(/matcher:\s*\['\/\(\(\?!.*brand.*\)\.\*\)'\]/);
  });

  test('la ruta se cachea inmutable, porque la URL es contrato de correos ya enviados', () => {
    // Un correo de hace seis meses sigue pidiendo esta ruta, así que el archivo no se
    // reemplaza en su sitio: un logo nuevo va como nombre nuevo. Sin esto, el proxy de
    // Gmail revalida contra nosotros mucho más seguido de lo que el archivo cambia.
    expect(config).toMatch(/source:\s*'\/brand\//);
    expect(config).toMatch(/max-age=31536000,\s*immutable/);
  });

  test('el cacheo inmutable NO alcanza a `public/` entero', () => {
    // El resto (favicon, íconos) sí se reemplaza; marcarlo inmutable dejaría a la gente
    // con la versión vieja durante un año y sin forma de purgarla.
    expect(config).not.toMatch(/source:\s*'\/:\w+\*?'/);
    expect(config).not.toMatch(/source:\s*'\/\(\.\*\)'/);
  });
});
