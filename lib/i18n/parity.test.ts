import { describe, expect, test } from 'bun:test';
import { es } from './dictionaries/es';
import { en } from './dictionaries/en';
import type { Dictionary } from './dictionary';

/**
 * CU-868kh8rz8 criterio 3: los dos diccionarios mantienen paridad.
 *
 * El tipo `Dictionary` ya obliga a que ambos tengan las mismas claves — pero solo
 * mientras alguien mantenga el tipo. La auditoría 2026-07-28 encontró el problema
 * inverso y más silencioso: claves que existían en los dos diccionarios y que ningún
 * componente usaba, porque el texto estaba quemado en español directamente en el JSX.
 * TypeScript no puede ver eso.
 *
 * Estos tests cubren la mitad que sí es automatizable: que ninguna clave quede vacía,
 * duplicada entre idiomas por copiar y pegar, o hueca al agregarla de un lado.
 */

function flatten(obj: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

const flatEs = flatten(es);
const flatEn = flatten(en);

describe('paridad de diccionarios ES/EN', () => {
  test('tienen exactamente el mismo conjunto de claves', () => {
    expect([...flatEn.keys()].sort()).toEqual([...flatEs.keys()].sort());
  });

  test('ninguna clave está vacía en ES', () => {
    const empty = [...flatEs].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  test('ninguna clave está vacía en EN', () => {
    const empty = [...flatEn].filter(([, v]) => v.trim() === '').map(([k]) => k);
    expect(empty).toEqual([]);
  });

  /**
   * Detecta el olvido típico: agregar la clave al diccionario inglés copiando el valor
   * español. Se exceptúan los casos en que el mismo texto ES/EN es correcto — nombres
   * propios, símbolos y términos que no se traducen. La lista es explícita a propósito:
   * agregar algo aquí obliga a justificarlo, en vez de dejar pasar cualquier
   * coincidencia.
   */
  const SAME_IN_BOTH_LOCALES = new Set([
    'common.machaInternal', // nombre propio
    'admin.eyebrow', // "ADMIN"
    'admin.title', // "Backoffice"
    'home.eyebrow', // "MACHA FINANCE"
    'chat.title', // "Chat"
    'dashboard.eyebrow', // "DASHBOARD" — se usa igual en español
    'upload.dropzoneHint', // ".xlsx, .xls o .csv" — extensiones
    'upload.status.failed', // "Error" — misma palabra en ambos idiomas
    'alerts.unit.percent', // "%"
    // CU-868kh8zvt — el backoffice pasa a ser bilingüe; estas dos coinciden de verdad.
    'admin.aiCost.colTokens', // "Tokens in/out" — la abreviatura es la misma en ambos
    'admin.companyDetail.colEmail', // "Email"
    // Ticket B5 — la vista consolidada trae las mismas dos cabeceras a la tabla de
    // empresas, por la misma razón: "Plan" se escribe igual en español y en inglés, y
    // "Tokens in/out" es la abreviatura que usa la industria en los dos idiomas.
    'admin.companies.colPlan',
    'admin.companies.colTokens',
    // Pantallas nuevas del prototipo MVP Macha.
    'analytics.colTotal', // "Total" — misma palabra en los dos idiomas
    'inventory.colSku', // "SKU" — sigla internacional, no se traduce
    'inventory.fieldSku', // idem
    // Ticket B3: la pantalla de créditos pasó a ser gestión de plan y su eyebrow es
    // "PLAN", que se escribe igual en español y en inglés.
    'credits.eyebrow',
  ]);

  test('ningún valor quedó sin traducir (idéntico en ES y EN sin justificación)', () => {
    const untranslated = [...flatEs]
      .filter(([k, v]) => flatEn.get(k) === v && !SAME_IN_BOTH_LOCALES.has(k))
      .map(([k]) => k);
    expect(untranslated).toEqual([]);
  });
});

/**
 * Las claves que este ticket agregó existen porque un componente las hardcodeaba en
 * español. Si alguien las borra, el componente vuelve a no compilar (son de uso
 * obligatorio en el JSX) — pero fijarlas aquí deja constancia de POR QUÉ existen, que
 * es lo que se perdió la primera vez.
 */
describe('claves introducidas por CU-868kh8rz8 (antes hardcodeadas)', () => {
  const REQUIRED: string[] = [
    'common.close', // aria-label de Dialog/Sheet — lo lee un lector de pantalla
    'reports.kpi.revenue',
    'reports.kpi.cogs',
    'reports.kpi.margin',
    'reports.table.period',
    'reports.table.frequency',
    'reports.table.updated',
    'upload.table.file',
    'upload.table.status',
    'upload.table.date',
    'dashboard.chart.period', // tabla sr-only de trend-chart
    'dashboard.chart.aging', // tabla sr-only de ar-ap-chart
  ];

  for (const key of REQUIRED) {
    test(`${key} existe en ambos diccionarios`, () => {
      expect(flatEs.has(key)).toBe(true);
      expect(flatEn.has(key)).toBe(true);
    });
  }
});

/**
 * CU-868kkgbtv: las claves del camino de FALLO del dropzone de documentos.
 *
 * `document-dropzone.tsx` tenía un `toast.error('No se pudo subir el archivo…')`
 * quemado en español; CU-868kkgb3c lo cambió por estas dos claves. Se fijan acá
 * porque son del camino que nadie ejercita a mano — un fallo de red al subir un
 * Excel — que es exactamente por lo que el string quemado sobrevivió a la primera
 * pasada de i18n. Si alguien las borra, el componente deja de compilar, pero esto
 * deja constancia de POR QUÉ existen.
 */
describe('claves del camino de fallo del dropzone (CU-868kkgbtv)', () => {
  const REQUIRED = ['common.loadError.network', 'common.loadError.server'];

  for (const key of REQUIRED) {
    test(`${key} existe en ambos diccionarios`, () => {
      expect(flatEs.has(key)).toBe(true);
      expect(flatEn.has(key)).toBe(true);
    });
  }
});

// Guarda de tipo: si `Dictionary` gana una rama nueva, ambos diccionarios la deben
// satisfacer para que este archivo compile.
const _typecheck: [Dictionary, Dictionary] = [es, en];
void _typecheck;
