import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CU-868kkgb8f criterios 1 y 3: los boundaries existen.
 *
 * Un `error.tsx` que falta no rompe nada visible: typecheck, lint y tests siguen en verde
 * y la app funciona con normalidad. Solo se nota el día que el backend se cae — que es el
 * día en que nadie está mirando si el archivo sigue ahí. Por eso se fija por ruta: es el
 * único fallo de este ticket que puede reaparecer sin que nada más se queje.
 *
 * Cada entrada dice POR QUÉ ese segmento necesita el suyo, que es lo que evita que alguien
 * lo borre pensando que está duplicado.
 */
const REQUERIDOS: Array<[ruta: string, motivo: string]> = [
  [
    'app/(app)/error.tsx',
    'las páginas de cliente llaman a apiFetch, que lanza ante cualquier non-2xx',
  ],
  [
    'app/admin/error.tsx',
    '/admin no cuelga de app/(app)/, así que no hereda su boundary y caería al global-error',
  ],
  [
    'app/not-found.tsx',
    'el notFound() con el que app/admin/layout.tsx tapa el backoffice mostraría la página por defecto de Next',
  ],
  ['app/global-error.tsx', 'CU-868kjc99f: sin él, un error de render de React no llega a Sentry'],
];

describe('boundaries de ruta', () => {
  test.each(REQUERIDOS)('existe %s — %s', (ruta) => {
    expect(existsSync(join(import.meta.dir, '..', ruta))).toBe(true);
  });
});
