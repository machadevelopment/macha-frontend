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

  test('critical → danger, warning → warning, e `info` sin chip', () => {
    /*
     * ⚠️ ESTE TEST EXIGÍA `'neutral'` PARA `info`, Y ESO CAMBIÓ (CU-868kx7a73).
     *
     * Jose: *"sale la palabra CONTEXTO; que ese tag sea según la data, por ejemplo cashflow o
     * revenue"*. "Contexto" es el rótulo de `info`, y salía como un chip del mismo peso que
     * "Urgente" justo al lado del tema — dos etiquetas contiguas iguales se leen como una sola
     * cosa, y la que más llamaba la atención era la que no significaba nada.
     *
     * El razonamiento viejo ("`neutral` para no gastar la señal que `critical` necesita") era
     * correcto y este lo termina: la forma más barata de no gastar una señal es no emitirla.
     * La AUSENCIA de chip es "no urge".
     */
    const bloque = panel.slice(panel.indexOf('<Badge'), panel.indexOf('</Badge>'));
    expect(bloque).toContain("'danger'");
    expect(bloque).toContain("'warning'");
    // La guarda es lo que hace que `info` no llegue nunca al Badge.
    expect(panel).toContain("insight.severity !== 'info'");
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
     * `insight_requests` es un ledger append-only con consejos guardados ANTES de que existiera
     * el campo. Tratarlos como el nivel más bajo es lo correcto: no se puede afirmar que algo
     * urge cuando nadie lo evaluó.
     *
     * Se comprueba en los DOS lugares que lo deciden, y desde CU-868kx7a73 son distintos: el
     * ORDEN sigue usando `?? 'info'` para colocarlo al final, y el CHIP lo omite por la guarda
     * de verdad (`insight.severity &&`), que también cubre el `undefined`. Antes bastaba con
     * mirar el primero porque el chip se pintaba siempre.
     */
    expect(panel).toContain("rango[a.severity ?? 'info']");
    expect(panel).toContain('{insight.severity && insight.severity');
  });

  test('la acción solo se pinta si vino', () => {
    // Un consejo de contexto ("tus ventas crecieron 30 %") no tiene acción, y obligar al modelo a
    // inventarle una produce exactamente el consejo vacío que este panel no debería dar.
    expect(panel).toContain('{insight.action && (');
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * "EL CONSEJO FINANCIERO DIARIO NO SIRVE" — CU-868kx4a02 (Jose, 2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El ticket decía que faltaba detalle y que no había captura. La captura SÍ estaba adjunta y
 * dice exactamente qué pasó: el panel clavado en **"Generating…"**, el botón deshabilitado y
 * ningún resultado.
 *
 * Y la generación no era el problema. Medido en la base de producción: **10 consejos pedidos
 * ese mismo día, los 10 con resultado guardado**, y específicos — con cifras reales de la
 * empresa, no texto genérico. El backend contestó; la pantalla no se enteró.
 *
 * Lo que faltaba era un TECHO DE ESPERA. Si la conexión queda abierta sin responder —el
 * contenedor muere con la petición en vuelo, que es lo que hacía el backend ese día— `fetch` no
 * rechaza nunca, el `await` no vuelve y el estado se queda en `loading` para siempre. La única
 * salida era recargar la página.
 */
describe('el consejo diario no se puede quedar generando para siempre', () => {
  test('la petición lleva un AbortController con temporizador', () => {
    /*
     * Las dos piezas juntas: sin el `signal`, el `abort()` no alcanza a la petición; sin el
     * `setTimeout`, el controlador no se dispara nunca. Tener una sola es no tener ninguna.
     */
    expect(panel).toContain('new AbortController()');
    expect(panel).toMatch(/setTimeout\(\(\) => corte\.abort\(\), 90_000\)/);
    expect(panel).toContain('corte.signal');
  });

  test('el temporizador se limpia cuando la respuesta llegó', () => {
    /*
     * Sin esto, cada consejo generado deja un `setTimeout` de 90 s pendiente. El panel vive en
     * el rail del dashboard toda la sesión, así que se acumulan — y el `abort()` de uno viejo
     * podría cancelar una petición nueva.
     */
    expect(panel).toContain('clearTimeout(reloj)');
  });

  test('al vencer cae al estado que YA ofrece reintentar', () => {
    /*
     * Un aborto hace que `fetch` rechace, y `request` trata cualquier rechazo como `network`,
     * que `classify` manda a `failed`. Ese estado ya pinta el botón de reintentar, así que no
     * hace falta un motivo nuevo: para el usuario "no contestó" y "falló" se resuelven igual.
     */
    expect(panel).toContain("return { kind: 'failed', detail };");
    expect(panel).toContain('labels.insightError.retry');
  });
});
