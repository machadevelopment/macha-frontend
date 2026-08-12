import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolveSentryEnvironment } from './sentry-environment';

/**
 * CU-868kmr1tb. La regresión que se vigila no es un cálculo difícil, es un descuido caro:
 * dejar que el `environment` salga de `NODE_ENV`. En Vercel un deploy de preview corre con
 * `NODE_ENV=production` igual que el de verdad, así que cada PR abierto mandaría eventos
 * etiquetados `production` al tablero del cliente real.
 */
describe('resolveSentryEnvironment', () => {
  test('preview y production NO se confunden pese a compartir NODE_ENV=production', () => {
    expect(resolveSentryEnvironment(undefined, 'production', 'production')).toBe('production');
    expect(resolveSentryEnvironment(undefined, 'preview', 'production')).toBe('preview');
  });

  test('el override explícito gana sobre la variable de la plataforma', () => {
    expect(resolveSentryEnvironment('canary', 'production', 'production')).toBe('canary');
  });

  test('fuera de Vercel cae a NODE_ENV', () => {
    expect(resolveSentryEnvironment(undefined, undefined, 'development')).toBe('development');
  });

  test('una variable presente pero VACÍA no es un entorno (estado normal en la UI de Vercel)', () => {
    expect(resolveSentryEnvironment('', '', 'production')).toBe('production');
    expect(resolveSentryEnvironment('', '', '')).toBe('development');
  });

  test('nunca devuelve cadena vacía ni undefined', () => {
    expect(resolveSentryEnvironment(undefined, undefined, undefined)).toBe('development');
  });
});

/**
 * Los tres `Sentry.init` son runtimes distintos del MISMO deploy. Si uno se queda sin
 * `environment`, sus eventos caen en otro bucket y el tablero miente por omisión — sin
 * romper nada, sin fallar el build. Se valida el texto por la misma razón que
 * `next.config.test.ts`: importarlos ejecutaría el SDK dentro de `bun test`.
 */
describe('los tres runtimes etiquetan su environment (CU-868kmr1tb)', () => {
  const archivos = {
    servidor: 'sentry.server.config.ts',
    edge: 'sentry.edge.config.ts',
    cliente: 'instrumentation-client.ts',
  } as const;

  for (const [runtime, archivo] of Object.entries(archivos)) {
    test(`${runtime}: pasa environment resuelto, no NODE_ENV a secas`, () => {
      const fuente = readFileSync(new URL(`../${archivo}`, import.meta.url), 'utf8');
      expect(fuente).toContain('environment: resolveSentryEnvironment(');
      expect(fuente).not.toMatch(/environment:\s*process\.env\.NODE_ENV/);
    });
  }

  test('el cliente usa las variables NEXT_PUBLIC_*, únicas que llegan al navegador', () => {
    const fuente = readFileSync(new URL('../instrumentation-client.ts', import.meta.url), 'utf8');
    expect(fuente).toContain('process.env.NEXT_PUBLIC_VERCEL_ENV');
    // `VERCEL_ENV` a secas no existe en el bundle del navegador: quedaría `undefined`.
    expect(fuente).not.toMatch(/process\.env\.VERCEL_ENV/);
  });
});
