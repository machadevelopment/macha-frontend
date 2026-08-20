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

  test('el botón se apaga cuando no hay nada que mandar', () => {
    // Un botón activo que no hace nada es peor que uno apagado: el cliente aprieta, no pasa
    // nada visible, y concluye que la pantalla está rota.
    expect(FUENTE).toContain('disabled={guardando || listas.length === 0}');
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
