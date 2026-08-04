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
