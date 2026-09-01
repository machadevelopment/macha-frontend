import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * "Solo tú sabes qué son estos" — decisión de Semi, 2026-08-20.
 *
 * Esta pantalla le pide al dueño de la PYME que clasifique lo que la ingesta no entendió, y su
 * respuesta ESCRIBE en su contabilidad. Lo que se protege acá son las tres cosas que pueden
 * salir mal sin que nada falle:
 *
 *  1. **Que los textos dejen de estar en su idioma.** Un desplegable que dice `opex` o
 *     `cogs` no lo contesta nadie que lleve una tienda, y la pantalla renderiza perfecto.
 *  2. **Que se sumen montos de distinta moneda.** Un dólar contado como un quetzal subestima
 *     ~7,7 veces, al lado del nombre del concepto, y el cliente sin forma de notarlo.
 *  3. **Que un marcador se pierda** y el número desaparezca del texto sin dejar rastro.
 */

const FUENTE = readFileSync(new URL('./conceptos-pendientes.tsx', import.meta.url), 'utf8');

/**
 * La fuente SIN comentarios, para las aserciones NEGATIVAS.
 *
 * Un `not.toContain('montoTotal')` sobre el archivo completo falla en cuanto un comentario
 * menciona `montoTotal` para explicar por qué no se usa — y ese comentario es justamente lo que
 * evita que alguien lo reintroduzca. El chequeo tiene que mirar CÓDIGO, no prosa.
 */
const CODIGO = FUENTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe.each([
  ['es', es],
  ['en', en],
])('los textos hablan el idioma del cliente (%s)', (_idioma, dict) => {
  const c = dict.upload.conceptos;

  test('ningún texto queda vacío', () => {
    const planos = [
      c.cta,
      c.title,
      c.subtitle,
      c.rows,
      c.typeLabel,
      c.categoryLabel,
      c.categoryPlaceholder,
      c.submit,
      c.submitting,
      c.done,
      c.error,
      c.empty,
    ];
    for (const t of planos) expect(t.trim()).not.toBe('');
    for (const t of Object.values(c.type)) expect(t.trim()).not.toBe('');
  });

  test('los tipos se dicen en palabras del negocio, no en jerga contable', () => {
    /*
     * El valor que viaja al backend es `opex`/`cogs`/`revenue`/`other` porque es lo que su
     * esquema acota. Lo que el cliente LEE no puede ser eso: nadie que lleve una tienda debería
     * tener que aprender la palabra "opex" para contestar qué es un pago a su proveedor de
     * internet.
     *
     * Se comprueba que la etiqueta no sea la clave, que no sea una sola palabra técnica, y que
     * ninguna de las cuatro repita a otra — dos opciones con el mismo texto en un desplegable
     * hacen imposible elegir.
     */
    for (const [clave, etiqueta] of Object.entries(c.type)) {
      expect(etiqueta.toLowerCase()).not.toBe(clave);
      expect(etiqueta.toLowerCase()).not.toContain('opex');
      expect(etiqueta.toLowerCase()).not.toContain('cogs');
    }
    const etiquetas = Object.values(c.type);
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
  });

  test('el subtítulo dice que la respuesta SIRVE PARA LAS PRÓXIMAS cargas', () => {
    /*
     * Es la razón por la que vale contestar, y sin ella la pantalla se lee como un trámite. No
     * se verifica una frase exacta —eso sería fijar la redacción— sino que mencione lo próximo
     * o lo futuro, que es la idea que no puede perderse al editar el copy.
     */
    const t = c.subtitle.toLowerCase();
    const habla = ['próxim', 'proxim', 'futur', 'next', 'again', 'siguiente'].some((p) =>
      t.includes(p),
    );
    expect(habla).toBe(true);
  });

  test('el mensaje de "listo" dice CUÁNTAS filas se acomodaron', () => {
    // Es la prueba de que contestar cambió algo hoy, no solo que se guardó una regla. Un
    // "listo" a secas deja al cliente sin saber si su respuesta sirvió.
    expect(c.done).toContain('{n}');
  });

  test('los marcadores que el componente reemplaza existen en el texto', () => {
    // Si alguien edita el copy y borra un marcador, el número simplemente no aparece: no hay
    // error, no hay log, y la línea queda diciendo "filas ·" sin nada.
    expect(c.cta).toContain('{n}');
    expect(c.rows).toContain('{n}');
    expect(c.rows).toContain('{monto}');
  });
});

describe('los montos NUNCA se suman entre monedas', () => {
  /*
   * Estas filas están en staging: traen `originalAmount` + `originalCurrency` y todavía no
   * tienen la cifra convertida, porque la conversión ocurre al promover con la tasa
   * snapshoteada por fila. O sea que no hay un total convertido que mostrar.
   *
   * El backend ya las devuelve separadas por moneda; lo que se protege acá es que el componente
   * no las vuelva a juntar. Se valida el TEXTO de la fuente porque el fallo no es de render: es
   * una suma que da un número perfectamente plausible.
   */
  test('el componente no reduce los montos a un solo número', () => {
    // Sobre el CÓDIGO y no sobre el archivo: los comentarios nombran `montoTotal` a propósito,
    // para explicar el bug que se evita.
    expect(CODIGO).not.toMatch(/montos\s*\.\s*reduce/);
    expect(CODIGO).not.toContain('montoTotal');
  });

  test('cada moneda se formatea con la SUYA, no con una fija', () => {
    // `formatMoney(m.total, m.currency, ...)`: la moneda sale de la entrada. Pasarle una
    // constante pintaría un total en dólares con el símbolo del quetzal.
    expect(FUENTE).toContain('formatMoney(m.total, m.currency, locale)');
  });

  test('no revienta si el backend todavía devuelve la forma vieja', () => {
    /*
     * ═══ ESTO NO ES DEFENSA ESPECULATIVA: YA PASÓ ═══
     *
     * Los dos repos no despliegan de forma atómica —este componente en Vercel, el endpoint en
     * Railway— y durante esa ventana el backend puede devolver una forma vieja. Con la primera
     * versión (`montoTotal` único), `montos.filter(...)` sobre `undefined` no degradaba: tumbaba
     * el panel al abrirlo. El cliente no veía "sin monto", veía una pantalla rota.
     *
     * En un dato de APOYO, no poder mostrarlo vale mucho menos que tumbar la pantalla que sí
     * sirve: la lista de conceptos se contesta igual sin la cifra.
     */
    expect(FUENTE).toContain('if (!Array.isArray(montos)) return');
    expect(FUENTE).toContain("montos: Concepto['montos'] | undefined");
  });

  test('una moneda que el producto no maneja se omite en vez de formatearse a la fuerza', () => {
    // `formatMoney` acota a GTQ/USD. Mostrar una tercera con el símbolo equivocado sería peor
    // que no mostrarla.
    expect(FUENTE).toContain("m.currency === 'GTQ' || m.currency === 'USD'");
  });
});

describe('el formulario no puede clasificar sin que el cliente escriba el rubro', () => {
  test('solo se mandan los conceptos con rubro escrito', () => {
    /*
     * El desplegable trae un valor por defecto y el campo de rubro no. Sin este filtro, abrir
     * el panel y apretar "guardar" clasificaría TODOS los conceptos como el tipo por defecto,
     * con rubro vacío — y el rubro vacío vuelve a marcar la fila por `missing_category`, así
     * que el cliente habría contestado para nada Y ensuciado su diccionario.
     */
    expect(FUENTE).toContain("filter(([, r]) => r.category.trim() !== '')");
  });

  test('el botón mira el rubro DEL concepto en pantalla, no las respuestas acumuladas', () => {
    /*
     * ⚠️ Este test afirmaba el STRING `disabled={guardando || listas.length === 0}` y pasaba
     * en verde mientras la conducta estaba mal: `listas` son las respuestas ACUMULADAS, así
     * que el candado solo protegía a la PRIMERA pregunta y a partir de la segunda el botón
     * quedaba activo con el campo vacío. Probaba la implementación, no lo que el cliente
     * necesita — el mismo error que `email-shell.test.ts` documenta haber cometido con el
     * logo. La conducta la mide `tarjeta-guiada.test.tsx`, que MONTA el componente; acá solo
     * queda fijado que la condición se evalúa sobre el concepto actual.
     */
    expect(FUENTE).toContain("(respuestas[actual.concepto]?.category ?? '').trim() === ''");
    expect(FUENTE).not.toContain('disabled={guardando || listas.length === 0}');
  });
});

describe('lo contestado no reaparece', () => {
  test('los conceptos resueltos se quitan de la lista sin volver a pedirla', () => {
    /*
     * No es por ahorrar la petición: la promoción va POR COLA, así que un GET inmediato después
     * de contestar puede devolver los mismos conceptos todavía pendientes. El cliente vería
     * reaparecer lo que acaba de contestar y concluiría que no se guardó.
     */
    expect(FUENTE).toContain('contestados.has(c.concepto)');
    // El filtrado es LOCAL sobre el estado previo, no una respuesta nueva del servidor.
    expect(FUENTE).toContain('setConceptos((previos) =>');
    /*
     * Una primera versión de este test intentaba probar la ausencia del refetch con un regex de
     * proximidad (`/setResueltas[\s\S]{0,200}await request/`). No servía: casaba con la
     * declaración del `useState` y el `request` del `alternar()` que viene abajo, o sea que
     * fallaba con el código correcto. La cercanía en el texto no es una señal de nada; lo que
     * se puede afirmar es qué hace el código, y eso son las dos líneas de arriba.
     */
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * UNA PREGUNTA A LA VEZ (CU-868kyur58)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El rediseño es de PRESENTACIÓN: mismo contrato, mismo endpoint, misma llamada única al
 * guardar. Lo que se protege acá es justamente eso — que la reescritura visual no se lleve por
 * delante ninguna de las garantías que el panel ya tenía.
 */
describe('la tarjeta guiada conserva lo que el panel ya garantizaba', () => {
  test('sigue siendo UNA sola llamada al guardar, con todas las respuestas juntas', () => {
    /*
     * El riesgo del "una pregunta a la vez" es convertirlo en un POST por concepto: cuatro
     * llamadas, cuatro promociones encoladas y un cliente que ve el dashboard moverse a
     * pedazos. Se acumula en `respuestas` y se manda al final, como antes.
     */
    expect(CODIGO).toContain("method: 'POST'");
    expect(CODIGO.match(/method: 'POST'/g)).toHaveLength(1);
    expect(CODIGO).toContain('respuestas: listas.map');
  });

  test('el botón principal sigue apagado sin rubro escrito EN ESTE concepto', () => {
    // Ver la nota del test hermano de arriba: la versión que miraba `listas.length` dejaba el
    // botón encendido desde la segunda pregunta, y apretarlo avanzaba sin guardar nada de la
    // que se estaba mirando. La conducta se mide montando el componente.
    expect(CODIGO).toContain("(respuestas[actual.concepto]?.category ?? '').trim() === ''");
  });

  test('las opciones de tipo son radios de verdad, no divs clicables', () => {
    /*
     * Media implementación sería peor que un `<select>`: cuatro tarjetas que se ven elegibles
     * y que el teclado no alcanza. `role="radio"` + `aria-checked` es lo que hace que un
     * lector de pantalla anuncie "opción 1 de 4, seleccionada".
     */
    expect(CODIGO).toContain('role="radiogroup"');
    expect(CODIGO).toContain('role="radio"');
    expect(CODIGO).toContain('aria-checked={elegido}');
  });

  test('el progreso viaja como TEXTO además de como puntos', () => {
    // Cuatro rectángulos de color no le dicen nada a quien no los ve.
    expect(CODIGO).toContain('aria-hidden="true"');
    expect(CODIGO).toContain('labels.progress');
    expect(CODIGO).toContain('sr-only');
  });

  test('el punto CONTESTADO usa el verde funcional y el actual la tinta de marca', () => {
    /*
     * Regla de los dos verdes: "esto ya está" es un estado del DATO (`success`), y el salvia
     * queda para "esto es Macha" — el orbe y el resalte del concepto. Invertirlos haría que el
     * color de marca significara progreso, que es exactamente lo que la regla prohíbe.
     */
    expect(CODIGO).toContain('bg-success');
    expect(CODIGO).toContain('bg-brand-ink');
  });

  test('omitir el ÚLTIMO concepto guarda lo contestado en vez de tirarlo', () => {
    // Sin esta rama, "omitir por ahora" en la última pregunta descarta las tres respuestas
    // anteriores — el cliente hizo el trabajo y el producto lo pierde.
    expect(CODIGO).toContain('esUltimo');
    // El `?` que decide guardar-vs-avanzar sobrevive al formateo de Prettier, así que se
    // normalizan los espacios antes de buscarlo en vez de fijar un salto de línea concreto.
    expect(CODIGO.replace(/\s+/g, ' ')).toContain('esUltimo ? listas.length > 0');
  });

  test('ningún texto de la tarjeta queda quemado en el componente', () => {
    // El panel del cliente es bilingüe como el resto: los cuatro textos nuevos salen del
    // diccionario, igual que los que ya existían.
    for (const t of ['labels.typeHint', 'labels.submitNext', 'labels.submitLast', 'labels.skip']) {
      expect(CODIGO).toContain(t);
    }
  });
});

describe('los textos nuevos existen en los dos idiomas', () => {
  test.each([
    ['es', es],
    ['en', en],
  ])('%s trae ayuda por tipo, botones y progreso', (_idioma, dict) => {
    const c = dict.upload.conceptos;
    for (const t of ['revenue', 'cogs', 'opex', 'other'] as const) {
      expect(c.typeHint[t].trim().length).toBeGreaterThan(0);
    }
    // Los marcadores tienen que sobrevivir a cualquier reescritura del copy: sin ellos el
    // botón diría «Guardar y seguir → {siguiente}» literal.
    expect(c.submitNext).toContain('{siguiente}');
    expect(c.progress).toContain('{n}');
    expect(c.progress).toContain('{total}');
    expect(c.submitLast.trim().length).toBeGreaterThan(0);
    expect(c.skip.trim().length).toBeGreaterThan(0);
  });
});
