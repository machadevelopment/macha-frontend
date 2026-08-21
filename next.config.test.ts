import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

/**
 * CU-868kjc99f. Estas dos piezas de `next.config.mjs` son invisibles: si alguien las
 * quita, todo sigue compilando, el gate sigue verde y Sentry deja de reportar en
 * silencio. Es exactamente como llegó el repo a este ticket — el SDK instalado, los
 * tres `Sentry.init` escritos, y ni un evento saliendo.
 *
 * Se valida el TEXTO del archivo y no el objeto exportado a propósito: importarlo
 * ejecutaría el plugin de Sentry (que arrastra rollup y su binario nativo) dentro de
 * `bun test`, convirtiendo un test de configuración en un test de toolchain.
 */
const config = readFileSync(new URL('./next.config.mjs', import.meta.url), 'utf8');
const middleware = readFileSync(new URL('./middleware.ts', import.meta.url), 'utf8');

describe('next.config.mjs — wiring de Sentry (CU-868kjc99f)', () => {
  test('la config se exporta envuelta en withSentryConfig', () => {
    expect(config).toContain('withSentryConfig');
    expect(config).toMatch(/export default withSentryConfig\(/);
  });

  test('instrumentationHook está activo (en Next 14 sin esto register() nunca corre)', () => {
    expect(config).toMatch(/instrumentationHook:\s*true/);
  });

  test('los source maps se borran del output tras subirse (no quedan públicos)', () => {
    expect(config).toMatch(/deleteSourcemapsAfterUpload:\s*true/);
  });

  test('org/project/token salen del entorno, nunca del repo', () => {
    expect(config).toContain('process.env.SENTRY_ORG');
    expect(config).toContain('process.env.SENTRY_PROJECT');
    expect(config).toContain('process.env.SENTRY_AUTH_TOKEN');
    // Un DSN o un token literal en el archivo sería una credencial versionada.
    expect(config).not.toMatch(/sntrys_|https:\/\/[0-9a-f]{16,}@/);
  });
});

describe('tunnelRoute y middleware van juntos (CU-868kjc99f)', () => {
  /**
   * El túnel es una ruta del propio dominio. Si el matcher de `middleware.ts` la cubre,
   * `authkitProxy` le exige sesión y los errores de `/` —la única pantalla pública, y
   * donde falla justamente quien no logra entrar— se responden con un redirect al login
   * en vez de reportarse. Los dos valores tienen que coincidir.
   */
  const tunnel = config.match(/tunnelRoute:\s*'([^']+)'/)?.[1];

  test('tunnelRoute es una ruta fija (no `true`, que sería aleatoria por build)', () => {
    expect(tunnel).toBe('/monitoring');
  });

  test('esa misma ruta está excluida del matcher del middleware', () => {
    expect(tunnel).toBeDefined();
    expect(middleware).toContain(`${tunnel!.replace('/', '')}`);
    expect(middleware).toMatch(/matcher:\s*\['\/\(\(\?!.*monitoring.*\)\.\*\)'\]/);
  });
});

/**
 * El isotipo que va en los correos — el arreglo del logo roto que reportó Jose.
 *
 * Estos dos hechos son de la misma clase que los de Sentry: si alguien los deshace, el
 * build sigue verde, la app sigue funcionando y lo único que se rompe es una imagen
 * dentro de un correo ya enviado, que nadie de este lado vuelve a abrir.
 *
 * Se prueba el TEXTO por el mismo motivo que arriba (importar la config ejecuta el
 * plugin de Sentry), y por eso mismo no se puede probar la cabecera realmente servida.
 * Lo que sí queda fijado es que la intención esté escrita.
 */
describe('el isotipo de los correos se sirve como archivo público', () => {
  test('`brand` está FUERA del matcher del middleware', () => {
    /*
     * Es la mitad del arreglo que no se ve venir. Dentro del matcher, `authkitProxy`
     * responde 307 hacia WorkOS a quien pida el archivo — verificado contra producción
     * con `/icon.svg` — y un cliente de correo no sigue redirecciones para cargar una
     * imagen: pinta el `alt`. Que el archivo exista en `public/` no alcanza.
     */
    expect(middleware).toMatch(/matcher:\s*\['\/\(\(\?!.*brand.*\)\.\*\)'\]/);
  });

  test('la ruta se cachea inmutable, porque la URL es contrato de correos ya enviados', () => {
    // Un correo de hace seis meses sigue pidiendo esta ruta, así que el archivo no se
    // reemplaza en su sitio: un logo nuevo va como nombre nuevo. Sin esto, el proxy de
    // Gmail revalida contra nosotros mucho más seguido de lo que el archivo cambia.
    expect(config).toMatch(/source:\s*'\/brand\//);
    expect(config).toMatch(/max-age=31536000,\s*immutable/);
  });

  test('el cacheo inmutable NO alcanza a `public/` entero', () => {
    // El resto (favicon, íconos) sí se reemplaza; marcarlo inmutable dejaría a la gente
    // con la versión vieja durante un año y sin forma de purgarla.
    expect(config).not.toMatch(/source:\s*'\/:\w+\*?'/);
    expect(config).not.toMatch(/source:\s*'\/\(\.\*\)'/);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * EL FAVICON (2026-08-21)
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Tres cosas que fallan sin que nada se rompa, y una ya falló:
 *
 *  1. **Que el middleware lo intercepte.** Pasó: el matcher excluía `favicon.ico` —que no
 *     existe— y no `icon.svg`, que sí. `GET /icon.svg` respondía 307 hacia WorkOS en
 *     producción, así que el navegador pedía el ícono y recibía un redirect al login. El
 *     archivo se veía perfecto y no llegaba a ninguna pestaña.
 *  2. **Que la tinta se separe de la del sidebar.** El favicon lleva hex literal por
 *     obligación (el navegador lo pinta fuera del documento, no hay `:root` que resolver), así
 *     que es la única copia de un token que nada mantiene sincronizada.
 *  3. **Que pierda la adaptación al tema** y quede negro fijo, invisible en la barra de
 *     pestañas de un navegador en modo oscuro. Es la mitad del pedido de CU-868ktkwqn
 *     ("negras o blancas según el tema") que solo se puede cumplir dentro del SVG.
 */
describe('el favicon llega al navegador y coincide con el logo de la app', () => {
  const icono = readFileSync(new URL('./app/icon.svg', import.meta.url), 'utf8');
  /**
   * El SVG sin su comentario de cabecera, para las aserciones NEGATIVAS.
   *
   * Ese comentario nombra `#1C2419` y el salvia a propósito: explica por qué NO están. Un
   * `not.toContain` sobre el archivo completo falla justamente por la prosa que evita que
   * alguien los reintroduzca. Es el mismo error que ya cometí en
   * `components/upload/conceptos-pendientes.test.ts`, y esta es la tercera vez en el proyecto:
   * un chequeo negativo tiene que mirar CÓDIGO, nunca comentarios.
   */
  const svg = icono.replace(/<!--[\s\S]*?-->/g, '');
  const tokens = readFileSync(new URL('./styles/globals.css', import.meta.url), 'utf8');
  const marca = readFileSync(new URL('./components/ui/macha-mark.tsx', import.meta.url), 'utf8');

  test('`icon.svg` está FUERA del matcher del middleware', () => {
    // La regresión que ya ocurrió. Dentro del matcher, authkitProxy responde 307 hacia WorkOS
    // y la pestaña se queda con el ícono genérico del host.
    expect(middleware).toMatch(/matcher:\s*\['\/\(\(\?!.*icon\.svg.*\)\.\*\)'\]/);
  });

  test('la tinta es la MISMA que `--ink` de cada tema', () => {
    /*
     * `--ink` es lo que el sidebar termina heredando por `currentColor` desde `text-foreground`,
     * así que estos dos hex son lo que hace que la pestaña se parezca al logo de la app. Si
     * alguien cambia el token y no el favicon, la diferencia es sutil y nadie la reporta.
     */
    /*
     * Sobre `svg` y NO sobre `icono`: el comentario de cabecera CITA los dos hex para explicar
     * de dónde salen, así que buscarlos en el archivo completo pasa incluso con el SVG pintado
     * de otro color. Comprobado por mutación — la primera versión de este test no atrapaba un
     * `#000000` puesto a mano. Vale para las positivas igual que para las negativas.
     */
    const claro = tokens.match(/^\s*--ink:\s*(#[0-9a-fA-F]{6});/m)?.[1];
    expect(claro).toBeDefined();
    expect(svg.toLowerCase()).toContain(claro!.toLowerCase());

    // El del bloque oscuro: la SEGUNDA aparición del token en el archivo (`.dark`).
    const todos = [...tokens.matchAll(/--ink:\s*(#[0-9a-fA-F]{6});/g)].map((m) => m[1]!);
    expect(todos.length).toBeGreaterThan(1);
    expect(svg.toLowerCase()).toContain(todos[1]!.toLowerCase());
  });

  test('se adapta al tema del sistema, no queda negro fijo', () => {
    // Sin esto, "ponerlo negro" deja el isotipo invisible en la barra de pestañas de un
    // navegador en modo oscuro — la mitad de las pantallas.
    expect(svg).toContain('prefers-color-scheme: dark');
  });

  test('es MONOCROMO: sin degradado y sin tile de fondo', () => {
    /*
     * Decisión de QA de Macha (CU-868ktkwqn): "las 3 líneas del logo que sean solo negras o
     * blancas según el tema". El favicon era el último lugar con el degradado salvia, así que
     * la pestaña no se parecía al logo del riel.
     *
     * Y sin tile: existía para que el extremo casi blanco del degradado no se perdiera sobre
     * una pestaña clara. Con tinta plana ese problema no existe y el tile es una caja de más.
     */
    expect(svg).not.toContain('linearGradient');
    expect(svg).not.toContain('#A1B09B'); // el salvia de marca
    expect(svg).not.toContain('#1C2419'); // el tile oscuro que había
  });

  test('la geometría es la misma que el isotipo del sidebar', () => {
    /*
     * Mismo `viewBox` y mismas tres barras que `MachaMark`. No es purismo: el favicon y el logo
     * del riel se ven a segundos de distancia, y una proporción distinta se lee como "algo está
     * mal" sin que nadie sepa señalar qué. Copiarla a otra escala habría sido la forma de que
     * se separaran sin que nada avise.
     */
    expect(svg).toContain('viewBox="0 0 24 24"');
    for (const x of ['1.5', '9.4', '17.3']) {
      expect(svg, `barra en x=${x}`).toContain(`x="${x}"`);
      expect(marca, `barra en x=${x} del sidebar`).toContain(`x: ${x}`);
    }
    expect(svg).toContain('width="5.2"');
    expect(marca).toContain('width="5.2"');
  });
});
