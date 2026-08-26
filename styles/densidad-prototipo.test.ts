import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * LA DENSIDAD CONTRA EL PROTOTIPO — CU-868ktknbq
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * `tokens-prototipo.test.ts` (CU-868kt8bg0) fija los COLORES contra
 * `juanrodriguezbz/mvp-macha`, y dice explícitamente que los tokens de densidad quedan fuera
 * "porque para esos el prototipo no es autoridad".
 *
 * Ese hueco es por donde entró este ticket. QA reportó que "todo en la plataforma visualmente
 * está muy grande" comparando el panel con el prototipo, y al medir salió que la tipografía
 * titular NO era el problema: la etiqueta (11px/500), la cifra (24px/600) y el relleno de
 * tarjeta (16px) ya coincidían. Lo que no coincidía era la ESCALA DEL DATO DE APOYO y el
 * BREAKPOINT del grid, que nadie estaba mirando porque no había con qué compararlos.
 *
 * Así que ahora sí hay. Este archivo no prueba comportamiento: prueba que cuatro decisiones
 * medidas contra el prototipo sigan puestas. Se lee el archivo como TEXTO —igual que hace el
 * test de tokens— porque lo que hay que garantizar es la clase que se emite, y montar el
 * componente para leerle el `className` costaría un DOM para verificar un string.
 *
 * ═══ POR QUÉ UN TEST Y NO UN COMENTARIO ═══
 *
 * Porque ya pasó una vez. `pagetitle` se creó en CU-868kt8bg0 justo para que las pantallas de
 * producto dejaran de usar `h1`, con la nota escrita de que "el dashboard ya no lo usa" — y el
 * dashboard siguió usándolo cinco semanas, hasta este ticket. Un comentario no lo atrapó.
 */

const raiz = join(import.meta.dir, '..');
const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf-8');

describe('el grid de KPIs llega a 6 columnas donde la cifra entra (CU-868kuw01m)', () => {
  const kpis = leer('components/dashboard/period-kpis.tsx');

  /**
   * EL NÚMERO QUE IMPORTA. El prototipo pasa a 5 columnas en `lg` (1024px); nosotros lo
   * hacíamos en `2xl` (1536px). Una MacBook de 14" da 1512px de ancho de CSS —24px por debajo
   * del corte— así que en la máquina donde se demuestra el producto caíamos a 3 columnas, los
   * KPIs ocupaban dos filas y la gráfica de tendencia quedaba abajo del pliegue.
   */
  /**
   * ═══ REVISADO EN CU-868ku6r48, Y ESTE TEST PASABA POR LA RAZÓN EQUIVOCADA ═══
   *
   * La versión anterior afirmaba `toContain('lg:grid-cols-5')` sobre el ARCHIVO COMPLETO. Al
   * cambiar el grid a `kpi5:grid-cols-5` el test siguió pasando… porque el comentario que
   * documenta el cambio menciona `lg:grid-cols-5` para explicar qué había antes. O sea que
   * verificaba la documentación, no el código — es el segundo test de este archivo al que le
   * pasa lo mismo, así que ahora TODOS leen la cadena del `GRID` y ninguno el archivo.
   *
   * Y el valor esperado cambió por una medición: `lg` (1024px) era incorrecto. Con el rail de
   * 348px del dashboard, cinco tarjetas a 1080px dan 39px útiles —tres caracteres— y
   * `GTQ 389.9K` son diez. Los cortes ahora salen de dónde la cifra ENTRA.
   */
  /*
   * La `s` del flag no basta: `const GRID =` y su cadena pueden quedar en LÍNEAS DISTINTAS
   * según cómo prettier decida partir la línea —pasó al formatear este mismo ticket— así que el
   * patrón admite salto de línea entre el `=` y la comilla. Un test que se rompe al reformatear
   * el código sin cambiarlo obliga a mantenerlo a cambio de nada.
   */
  const grid = () => kpis.match(/const GRID =\s*'([^']*)'/)?.[1] ?? '';

  /*
   * ═══ CU-868kuw01m · SON SEIS TARJETAS, ASÍ QUE LA ESCALERA ES 1 / 2 / 3 / 6 ═══
   *
   * Este bloque afirmaba `kpi5:grid-cols-5` y `kpi4:grid-cols-4`. Esa era la escalera correcta
   * para CINCO tarjetas; con la de COGS son seis, y seis solo se reparten parejo entre 1, 2, 3
   * y 6 — en cuatro columnas la fila queda 4+2 y en cinco 5+1, una huérfana al lado de cuatro
   * huecos.
   *
   * Lo que el bloque protegía NO cambia y sigue afirmado abajo: el corte sale de dónde la cifra
   * ENTRA (medido, no de la escala redonda de Tailwind) y no se vuelve ni a `2xl` ni a `lg`.
   */
  test('la fila de 6 arranca donde la cifra cabe (1600px), no en la escala redonda', () => {
    expect(grid()).toContain('kpi6:grid-cols-6');
    // Y la escalera de abajo divide 6 sin dejar huérfanas.
    expect(grid()).toContain('md:grid-cols-3');
    expect(grid()).toContain('sm:grid-cols-2');
  });

  test('ningún paso deja una tarjeta huérfana: 6 no se divide entre 4 ni entre 5', () => {
    expect(grid()).not.toMatch(/grid-cols-4\b/);
    expect(grid()).not.toMatch(/grid-cols-5\b/);
  });

  test('NO vuelve a `2xl` (deja fuera la MacBook) ni a `lg` (corta las cifras)', () => {
    /*
     * Los dos extremos que ya se probaron y fallaron, cada uno por su lado:
     *   · `2xl` (1536px) dejaba una MacBook de 1512px en 3 columnas — el reporte original.
     *   · `lg` (1024px) metía cinco tarjetas donde caben tres caracteres.
     */
    expect(grid()).not.toContain('2xl:grid-cols-6');
    expect(grid()).not.toContain('lg:grid-cols-6');
    expect(grid()).not.toContain('xl:grid-cols-3');
  });

  test('`kpi6` vale lo que se MIDIÓ, y el config no deja cortes muertos', () => {
    /*
     * 1600px sale de medir en el navegador, con la SF Pro real y el tracking del token:
     * `GTQ 389.9K` a 20px (`kpi-sm`, que es lo que `escalaDeCifra` le da a 10 caracteres) mide
     * 107,1px, y seis columnas dan 97,3px útiles a 1512px — se cortaría.
     *
     * Y `kpi4`/`kpi5` se van del config: un breakpoint que nadie usa es una medición vieja
     * esperando a que alguien la aplique sin volver a medirla.
     */
    // Solo la línea de `screens`: la nota de arriba NOMBRA a `kpi4`/`kpi5` para contar por qué
    // se fueron, y afirmar sobre el archivo entero volvería a verificar la documentación en vez
    // del código — el error que este mismo archivo ya cometió dos veces.
    const screens = leer('tailwind.config.ts').match(/screens: \{[^}]*\}/)?.[0] ?? '';
    expect(screens).toMatch(/kpi6: '1600px'/);
    expect(screens).not.toMatch(/kpi4:|kpi5:/);
  });
});

describe('el dato de apoyo de la tarjeta de KPI va en `micro` (CU-868ktknbq)', () => {
  const tarjeta = leer('components/charts/kpi-card.tsx');
  const config = leer('tailwind.config.ts');

  /**
   * 10px es el valor del prototipo. Con `body` (14px/1.5) las tres líneas de apoyo —cifra
   * exacta, frase de ayuda y "vs mes anterior"— medían 21px cada una contra los 13px del
   * prototipo, y con el sparkline y el delta en medio la tarjeta salía en ~258px contra ~152px.
   */
  test('el token `micro` existe y vale 10px', () => {
    expect(config).toMatch(/micro:\s*\['10px'/);
  });

  test('el token `delta` existe y vale 12px, como el delta en línea del prototipo', () => {
    expect(config).toMatch(/delta:\s*\['12px'/);
  });

  test('la tarjeta ya no usa `body` para el dato de apoyo', () => {
    // `text-body` en esta tarjeta era, medido, la única diferencia de escala real con el
    // prototipo. Si vuelve, vuelve el reporte de QA. Se busca solo en los `className`, para no
    // chocar con los comentarios que nombran el valor viejo.
    const clases = [...tarjeta.matchAll(/className="([^"]*)"/g)].map((m) => m[1]).join(' ');
    expect(clases).not.toContain('text-body');
  });

  test('la cifra exacta y la secundaria van en mono; la frase de ayuda no', () => {
    /*
     * El matiz de la regla mono que este ticket introduce: lo que salió del mono fue la CIFRA
     * GRANDE (`text-kpi`), que es lo que hacía leer el producto como herramienta de
     * desarrollador. Un dato denso de 10px alineado debajo sí va en mono —es lo que hace el
     * prototipo y es donde el ancho fijo ayuda a leer—. El `hint` es prosa y no lo lleva.
     */
    expect(tarjeta).toContain('font-mono text-micro tabular-nums');
    expect(tarjeta).toContain('font-ui text-micro');
  });

  test('la cifra grande sigue SIN mono', () => {
    // La regla mono no se deshace: se acota. `text-kpi` nunca vuelve a mono.
    expect(tarjeta).not.toMatch(/font-mono[^"']*text-kpi|text-kpi[^"']*font-mono/);
  });
});

describe('el delta de la tarjeta va sin caja pero con flecha (CU-868ktknbq)', () => {
  const tarjeta = leer('components/charts/kpi-card.tsx');
  const badge = leer('components/charts/delta-badge.tsx');

  test('la tarjeta pide la presentación en línea', () => {
    expect(tarjeta).toContain('presentation="inline"');
  });

  /**
   * ═══ LA PARTE QUE NO ES COSMÉTICA ═══
   *
   * La regla de los dos verdes (CU-868knx0vh, aprobada por Jose) exige que el color de estado
   * nunca aparezca SOLO. La presentación en línea quita el fondo y el borde, así que el canal
   * redundante pasa a ser la FLECHA — y si alguien la quitara "porque ya está el color", el
   * delta quedaría dependiendo únicamente del color y quien no distingue verde de rojo no
   * podría leerlo. Eso es lo que este test impide.
   */
  test('la presentación en línea conserva la flecha como canal no cromático', () => {
    const enLinea = badge.slice(badge.indexOf("presentation === 'inline'"));
    expect(enLinea).toContain('<Flecha');
  });

  test('el chip sigue siendo el default, para donde no hay flecha', () => {
    // `key-alerts-card` rotula estados sin flecha: ahí el fondo y el borde son el único canal
    // redundante disponible y el chip es obligatorio.
    expect(badge).toMatch(/presentation\s*=\s*'chip'/);
  });
});

describe('la cifra de KPI se encoge antes que cortarse (CU-868ku6r48)', () => {
  const tarjeta = leer('components/charts/kpi-card.tsx');
  const config = leer('tailwind.config.ts');

  /**
   * ═══ POR QUÉ ESTO NO ES COSMÉTICO ═══
   *
   * `truncate` sobre una cifra financiera no recorta: MIENTE. Si lo que se pierde es la `K`,
   * `GTQ 389.9K` se lee como trescientos ochenta y nueve quetzales donde hay trescientos ochenta
   * y nueve mil — un factor de mil, en la cifra principal del dashboard, sin que nada falle.
   */
  test('existen los dos pasos de reducción', () => {
    expect(config).toMatch(/'kpi-sm': \['20px'/);
    expect(config).toMatch(/'kpi-xs': \['17px'/);
  });

  test('el tamaño lo decide el largo de la cadena, no una medición del DOM', () => {
    /*
     * Medir el ancho real con `ResizeObserver` sería lo exacto, y está descartado a propósito:
     * la tarjeta se pinta en el servidor, así que la primera pintura saldría con el tamaño
     * equivocado y saltaría al hidratar — en la cifra principal, en cada carga.
     */
    expect(tarjeta).toContain('function escalaDeCifra(value: string)');
    expect(tarjeta).toContain('escalaDeCifra(value)');
  });

  test('`truncate` se conserva como última red, no como mecanismo normal', () => {
    // Si algún día aparece una cadena más larga que todo lo previsto, se recorta DENTRO de su
    // tarjeta en vez de pintarse encima de la vecina. Pero deja de ser el camino habitual.
    expect(tarjeta).toContain('truncate');
  });
});

describe('el título del panel usa el token de pantalla de producto (CU-868ktknbq)', () => {
  const saludo = leer('components/dashboard/dashboard-greeting.tsx');

  /**
   * `pagetitle` (20px/600) se creó en CU-868kt8bg0 con la nota escrita de que `h1` (27px)
   * "sigue siendo el titular de las pantallas de VITRINA" y que una pantalla de producto
   * "ya no lo usa". El panel siguió usándolo cinco semanas. Este test es lo que evita la
   * tercera vez.
   */
  test('el saludo usa `pagetitle`, no `h1`', () => {
    /*
     * Se mira el `className` del <h1>, no el archivo entero, y esa distinción me la enseñó
     * este mismo test: el comentario que documenta el cambio NOMBRA `text-h1 font-normal` para
     * decir qué había antes, así que un `not.toContain` sobre todo el archivo fallaba contra la
     * documentación en vez de contra el código.
     */
    const clases = saludo.match(/<h1 className="([^"]*)"/)?.[1];
    expect(clases).toBeDefined();
    expect(clases).toContain('text-pagetitle');
    expect(clases).not.toContain('text-h1');
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL INSIGHT POINT DEL ASESOR VA SIN ÍCONO ADENTRO (reporte de Jose, 2026-08-26)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Las dos pantallas del asesor —la bienvenida del chat y el Consejo Financiero Diario— llevaban
 * un `Sparkles` dentro del círculo. Jose pidió lo contrario, y con un argumento que va más allá
 * del gusto: *"en vez de ese iconito de la estrellita, utilizar ese circulito"*, *"es como para
 * volverlo un poco menos AI"*.
 *
 * Una estrellita de destello es el cliché visual de "esto lo hizo una IA". El Insight Point es
 * la marca. Tapar la marca con el cliché era exactamente al revés de lo que el rediseño buscaba
 * — y como los dos usos comparten componente, tener uno con estrellita y el otro sin ella los
 * hacía leer como dos cosas distintas.
 *
 * El test mira el CÓDIGO FUENTE y no el render porque lo que se protege es la forma de usar el
 * componente: un `InsightPoint` con hijos en esas dos pantallas es el bug, tenga el ícono que
 * tenga.
 */
describe('el círculo del asesor no lleva ícono adentro', () => {
  const PANTALLAS_DEL_ASESOR = [
    join(import.meta.dir, '..', 'components', 'chat', 'chat-welcome.tsx'),
    join(import.meta.dir, '..', 'components', 'dashboard', 'insight-panel.tsx'),
    join(import.meta.dir, '..', 'components', 'chat', 'chat-client.tsx'),
  ];

  test.each(PANTALLAS_DEL_ASESOR)('%s monta el InsightPoint sin hijos', (ruta) => {
    const fuente = readFileSync(ruta, 'utf8');
    /*
     * Se buscan APERTURAS de etiqueta que no auto-cierren: `<InsightPoint ...>` con un `>` que
     * no venga precedido de `/`. Los comentarios se quitan primero — estos archivos CITAN la
     * versión vieja para explicar por qué cambió, y esa cita debe permitirse.
     */
    const sinComentarios = fuente
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\/.*$/gm, '');
    const conHijos = [...sinComentarios.matchAll(/<InsightPoint[^>]*[^/>]>/g)];
    expect(conHijos.map((m) => m[0])).toEqual([]);
  });

  /*
   * La contraparte: los otros usos del componente —el wizard de registro y el detalle de un
   * reporte— NO son el asesor y pueden llevar lo que quieran. El test no debe alcanzarlos, y si
   * alguien lo generaliza a todo el repo, esto lo recuerda.
   */
  test('la regla es del ASESOR, no del componente', () => {
    const fuente = readFileSync(
      join(import.meta.dir, '..', 'components', 'ui', 'insight-point.tsx'),
      'utf8',
    );
    // El componente sigue aceptando hijos: la restricción es de uso, no de API.
    expect(fuente).toContain('children');
  });
});
