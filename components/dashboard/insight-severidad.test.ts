import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SEVERIDAD Y ACCIÓN EN EL CONSEJO FINANCIERO DIARIO — CU-868ku6r48
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * El panel mostraba categoría y texto nada más. El equivalente del prototipo —fuente de verdad
 * visual— muestra además qué tan urgente es cada consejo y qué acción tomar, y Jose lo reportó
 * como gap con capturas lado a lado.
 *
 * No es un detalle de adorno: sin severidad, "tienes una cobranza vencida de Q92.100 con 31 días
 * de mora" y "tus ventas crecieron 30 %" se leen con el mismo peso, y quien abre el dashboard por
 * la mañana no sabe cuál mirar primero. Eso es justamente lo que un consejo diario existe para
 * resolver.
 */

const panel = readFileSync(
  join(import.meta.dir, '..', '..', 'components', 'dashboard', 'insight-panel.tsx'),
  'utf-8',
);

describe('el diccionario nombra los tres niveles, en los dos idiomas', () => {
  /*
   * El backend manda el CÓDIGO (`critical`/`warning`/`info`) y acá solo se traduce, igual que con
   * `insightCategory` y con `ruleKey` de las alertas. Y el panel admin es bilingüe por decisión
   * de negocio (CLAUDE.md), así que un nivel sin traducir sale en inglés en una demo en español.
   */
  for (const locale of ['es', 'en'] as const) {
    test(`${locale} tiene los tres`, () => {
      const s = getDictionary(locale).dashboard.insightSeverity;
      expect(Object.keys(s).sort()).toEqual(['critical', 'info', 'warning']);
      for (const v of Object.values(s)) expect(v.length).toBeGreaterThan(0);
    });
  }

  test('los rótulos son distintos entre sí y entre idiomas', () => {
    const es = getDictionary('es').dashboard.insightSeverity;
    const en = getDictionary('en').dashboard.insightSeverity;
    expect(new Set(Object.values(es)).size).toBe(3);
    expect(es.critical).not.toBe(en.critical);
  });
});

describe('la severidad se pinta como estado, no como tema', () => {
  /**
   * La regla de los dos verdes (aprobada por Jose) exige que el color de estado nunca aparezca
   * SOLO. Acá no hay flecha que sirva de canal redundante —a diferencia del delta de un KPI— así
   * que el chip con fondo y borde es obligatorio. Si alguien lo cambia por texto de color, quien
   * no distingue rojo de ámbar pierde la información entera.
   */
  test('usa Badge y no texto de color a secas', () => {
    expect(panel).toContain('<Badge');
    expect(panel).toContain('variant={');
  });

  test('critical → danger, warning → warning, y el resto neutral', () => {
    // `info` va en `neutral` a propósito: es contexto, y pintarlo de color gastaría la señal
    // que `critical` necesita para destacar.
    const bloque = panel.slice(panel.indexOf('<Badge'), panel.indexOf('</Badge>'));
    expect(bloque).toContain("'danger'");
    expect(bloque).toContain("'warning'");
    expect(bloque).toContain("'neutral'");
  });

  test('la CATEGORÍA sigue sin color', () => {
    // Lo que la nota original del componente defiende y sigue valiendo: el color en este
    // producto significa estado financiero, no tema. La categoría es tema.
    expect(panel).toContain('font-mono text-eyebrow uppercase text-faint');
  });
});

describe('el orden y la ausencia', () => {
  test('los consejos se ordenan por urgencia antes de pintarse', () => {
    /*
     * El backend no garantiza orden —el modelo emite en el orden que quiere— así que sin esto un
     * `critical` puede quedar tercero debajo de dos `info`. Y el panel vive en el rail derecho:
     * lo que queda abajo se lee tarde o no se lee.
     */
    expect(panel).toContain('ordenadosPorUrgencia(insights)');
    expect(panel).toContain('critical: 0');
  });

  test('un consejo SIN severidad se trata como `info`, no rompe', () => {
    /*
     * `insight_requests` es un ledger append-only con consejos guardados ANTES de este ticket que
     * no traen el campo. Tratarlos como el nivel más bajo es lo correcto: no se puede afirmar que
     * algo urge cuando nadie lo evaluó.
     */
    expect(panel).toContain("insight.severity ?? 'info'");
  });

  test('la acción solo se pinta si vino', () => {
    // Un consejo de contexto ("tus ventas crecieron 30 %") no tiene acción, y obligar al modelo a
    // inventarle una produce exactamente el consejo vacío que este panel no debería dar.
    expect(panel).toContain('{insight.action && (');
  });
});
