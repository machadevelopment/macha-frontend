import { describe, expect, test } from 'bun:test';
import { es } from './dictionaries/es';
import { en } from './dictionaries/en';

/**
 * EL DICCIONARIO CRUZA LA FRONTERA SERVIDOR→CLIENTE, ASÍ QUE TIENE QUE SER SERIALIZABLE.
 *
 * Este test existe por una caída de producción (2026-08-25, reporte de Jose: "inicio sesión
 * pero no carga el dashboard, se queda ahí colgado"). `dashboard.period.customSpan` se había
 * escrito como función —razonable en sí misma: el singular cambia la palabra, "1 día" y no
 * "1 días"— y `app/(app)/dashboard/page.tsx` es un Server Component que le pasa `t.dashboard`
 * entero a `PeriodKpis`, que es de cliente. React no puede serializar una función a través de
 * esa frontera:
 *
 *   Error: Functions cannot be passed directly to Client Components
 *     {label: "Período", ..., customSpan: function customSpan}
 *
 * El modo de fallo es peor que un error a secas y por eso merece test propio:
 *
 *   1. NINGÚN GATE LO VE. `tsc --noEmit`, `eslint`, `next build` y los tests pasaban los
 *      cuatro — el tipo declaraba la función, así que para TypeScript estaba todo bien. Solo
 *      falla al RENDERIZAR, en el servidor de producción.
 *   2. NO FALLA RÁPIDO, CUELGA. El error se lanza al serializar el stream RSC, que ya se
 *      había abierto: el navegador se queda con una pantalla en blanco hasta que Vercel corta
 *      la función a los 300 segundos y recién ahí devuelve 500. Es indistinguible de "el
 *      backend está caído", que fue justo lo que el equipo supuso durante un día.
 *   3. `parity.test.ts` NO PODÍA VERLO. Su `flatten` clasifica cada hoja como string o como
 *      objeto a recorrer, y `Object.entries(fn)` devuelve `[]`: la clave-función se caía del
 *      conjunto en silencio, sin desbalancear nada.
 *
 * La regla que este test fija es simple y no admite excepción: en el diccionario, toda hoja
 * es un string. El texto que necesita un valor lleva plantilla (`{n}`, `{from}`) y quien lo
 * pinta hace el `.replace`, que es lo que el resto del diccionario ya hacía.
 */
function hojasNoSerializables(obj: unknown, prefix = ''): string[] {
  const malas: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') continue;
    // `typeof null === 'object'`, y un null tampoco es texto que se pueda pintar.
    if (value !== null && typeof value === 'object')
      malas.push(...hojasNoSerializables(value, path));
    else malas.push(`${path} (${value === null ? 'null' : typeof value})`);
  }
  return malas;
}

describe('el diccionario es serializable de servidor a cliente', () => {
  test('ES: toda hoja es un string', () => {
    expect(hojasNoSerializables(es)).toEqual([]);
  });

  test('EN: toda hoja es un string', () => {
    expect(hojasNoSerializables(en)).toEqual([]);
  });
});
