import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CU-868kt8bg0 · LA CABECERA DE PANTALLA NO VUELVE A DIVERGIR.
 *
 * El defecto que este test fija no era de una pantalla: era que las diez tenían su
 * cabecera escrita a mano, y ninguna revisión visual detecta que la número once nació con
 * el patrón viejo. Por eso el test lee los ARCHIVOS de `app/(app)/` en vez de montar un
 * componente — lo que hay que garantizar es una propiedad del repositorio, no el render de
 * una página en particular.
 *
 * El caso que atrapa: alguien agrega una pantalla copiando la que tenía al lado y vuelve a
 * meter el trío eyebrow + h1 de 27px + subtítulo, con el eyebrow repitiendo el nombre que
 * el menú lateral ya muestra. Eso es literalmente el reporte "el título aparece dos veces".
 */

const RAIZ = join(import.meta.dir, '..', '..', 'app', '(app)');

function paginas(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...paginas(ruta));
    else if (entrada === 'page.tsx') salida.push(ruta);
  }
  return salida;
}

const ARCHIVOS = paginas(RAIZ);

/**
 * `reports/[id]` es la única excepción y es deliberada: su título no es el nombre de la
 * sección sino el PERÍODO del reporte, lo pone `ReportDetail` tras el fetch, y vive dentro
 * de la cabecera de VITRINA del documento (marca al 100%, design guide §2.7). No es una
 * cabecera de pantalla; es la portada de un documento que se comparte fuera del producto.
 */
const EXCEPCIONES = ['reports/[id]'];

function exceptuada(ruta: string) {
  return EXCEPCIONES.some((e) => ruta.replaceAll('\\', '/').includes(`(app)/${e}/`));
}

describe('cabecera de pantalla alineada al prototipo', () => {
  test('hay páginas que revisar (el recorrido no se rompió en silencio)', () => {
    expect(ARCHIVOS.length).toBeGreaterThan(8);
  });

  for (const ruta of ARCHIVOS) {
    const nombre = ruta.slice(ruta.indexOf('(app)'));
    const fuente = readFileSync(ruta, 'utf-8');

    test(`${nombre} · sin el eyebrow que repite el nombre de la sección`, () => {
      if (exceptuada(ruta)) return;
      expect(fuente).not.toContain('text-eyebrow uppercase text-faint');
    });

    test(`${nombre} · el título de pantalla no usa el h1 de vitrina`, () => {
      if (exceptuada(ruta)) return;
      // `text-h1` sigue existiendo para `/`, registro, invitación y errores — pantallas
      // que NO están bajo `(app)`. Bajo el shell del producto, el título es `pagetitle`.
      expect(fuente).not.toContain('text-h1');
    });

    test(`${nombre} · si titula, lo hace con PageHeader`, () => {
      if (exceptuada(ruta)) return;
      // Chat y dashboard no titulan a propósito (la navegación ya dice dónde estás / el
      // saludo hace de cabecera). Lo que no se admite es un <h1> suelto en la página.
      // `<h1 className=` y no `<h1`: los comentarios de cabecera de varias páginas
      // NOMBRAN la etiqueta al explicar por qué la quitaron, y buscar la cadena suelta
      // haría que documentar la decisión rompiera el test.
      if (!/<h1\s+className=/.test(fuente)) return;
      expect(fuente).toContain('<PageHeader');
    });
  }
});

describe('PageHeader', () => {
  const fuente = readFileSync(join(import.meta.dir, 'page-header.tsx'), 'utf-8');

  test('el ícono va en TINTA, no en el verde de marca', () => {
    // El prototipo lo pinta con `text-primary`, y su `--primary` es `0 0% 9%`: negro.
    // Traducirlo a "primario = color de marca" pondría salvia sobre cromo de navegación,
    // que es exactamente lo que la regla de los dos verdes prohíbe.
    expect(fuente).toContain('text-ink');
    expect(fuente).not.toContain('text-brand');
    expect(fuente).not.toContain('text-success');
  });

  test('el ícono comparte el grosor de trazo del resto del producto', () => {
    expect(fuente).toContain('strokeWidth={1.7}');
  });

  test('título e ícono van en la MISMA fila, con las acciones al extremo', () => {
    expect(fuente).toContain('items-center justify-between');
  });

  test('el título usa la escala del prototipo (20px/600), no la de vitrina', () => {
    expect(fuente).toContain('text-pagetitle');
    expect(fuente).not.toContain('text-h1');
  });
});
