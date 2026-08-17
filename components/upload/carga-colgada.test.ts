import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reporte de Jose (2026-08-14): *"ahorita se quedó trabada la ingesta"*.
 *
 * El backend ya permite desatascar una carga colgada, pero ese arreglo es INALCANZABLE si la
 * interfaz solo ofrece "reintentar" en `failed`. Un documento atascado en `processing` no
 * ofrece ninguna otra acción —no se puede revertir (exige `promoted`) ni cancelar (el worker
 * que leería la cancelación ya no existe)— así que el cliente se queda mirando un
 * "procesando" eterno sin nada que hacer.
 *
 * Esto se fija por lectura del archivo y no por render porque lo que puede romperse es una
 * CONDICIÓN, y romperla no falla nada: el botón simplemente deja de aparecer y el arreglo del
 * backend vuelve a ser inalcanzable, en silencio.
 */
const lista = readFileSync(join(import.meta.dir, 'document-list.tsx'), 'utf8');

describe('desatascar una carga colgada', () => {
  test('el botón de reintentar también aparece en una carga colgada', () => {
    expect(lista).toContain("doc.status === 'failed' || pareceColgada(doc)");
  });

  test('solo se considera colgada una carga EN CURSO', () => {
    // Ofrecer "reintentar" sobre un documento ya promovido o revertido invitaría a duplicar
    // datos; el backend lo rechazaría, pero el botón ya habría mentido.
    expect(lista).toContain("doc.status !== 'processing' && doc.status !== 'queued'");
  });

  test('el umbral es el vencimiento de la cola, no un número al azar', () => {
    // Una hora es el `expireInSeconds` de la cola de ingesta: pasado ese punto pg-boss ya dio
    // el job por muerto. Si alguien lo baja a minutos, el botón aparecería sobre cargas vivas.
    expect(lista).toContain('const COLGADA_MS = 60 * 60 * 1000');
  });
});
