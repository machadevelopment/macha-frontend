import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Las fuentes del producto (CU-868kfvah8, criterio de performance de la landing).
 *
 * ═══ POR QUÉ ESTE ARCHIVO EXISTE ═══
 *
 * `app/fonts/` es la única carpeta del repo cuyo CONTENIDO BINARIO es una decisión de
 * producto: son SF Pro Display subseteados a lo que el producto usa. Un subset rehecho sin
 * los rangos correctos no rompe el build, no rompe typecheck y no rompe ningún test de
 * componente — se ve en pantalla, en un carácter suelto, en el idioma que nadie estaba
 * mirando.
 *
 * Por eso lo que se afirma acá es el CONTENIDO de los archivos, no que existan.
 */

const raiz = join(import.meta.dir, '..');
const dirFuentes = join(raiz, 'app', 'fonts');

/**
 * Los 116 caracteres que el producto pinta y que el subset TIENE que conservar.
 *
 * No es una lista defensiva: cada grupo está por algo que se rompería si faltara.
 */
const NECESARIOS = [
  'abcdefghijklmnopqrstuvwxyz0123456789',
  // Español: sin esto, la mitad de la interfaz cae al fallback en una palabra sí y otra no.
  'áéíóúüñÁÉÍÓÚÜÑ¿¡',
  // Monedas. La `Q` del quetzal es una letra normal; las que hay que vigilar son estas.
  '$€£¥₡₲',
  /*
   * Las flechas del delta de KPI. NO son decoración: son el canal redundante que exige la
   * regla de los dos verdes — quien no distingue verde de rojo tiene que poder leer el
   * signo. Si el subset se las come, el delta queda dependiendo SOLO del color y se pierde
   * una garantía de accesibilidad sin que nada falle.
   */
  '↗↘→←↑↓',
  // Puntuación tipográfica: el diseño usa guion largo y comillas curvas, no las de máquina.
  '–—…•·«»“”‘’',
  '±×÷−≈≤≥%‰',
  '©®™°§¶†‡',
  // Otras lenguas latinas: el producto es ES/EN, pero un nombre de cliente o de proveedor
  // no pregunta en qué idioma está la interfaz.
  'çÇàèìòùÀÈÌÒÙâêîôûäëïöÿãõÃÕ',
].join('');

/*
 * ═══ LO QUE ESTE ARCHIVO NO HACE, Y POR QUÉ ═══
 *
 * No abre el `cmap` de los woff2 para comprobar glifo a glifo. Un woff2 no es brotli a
 * secas: trae un directorio de tablas con codificación propia, así que leerlo desde el test
 * significaría escribir un parser de woff2 en TypeScript para verificar un artefacto que se
 * genera con `fontTools`. El parser tendría más superficie de error que lo que verifica.
 *
 * La comprobación glifo a glifo vive donde se genera el subset (`app/fonts/README.md`, el
 * script imprime los faltantes y falla si hay alguno). Acá se fija lo que el repo SÍ puede
 * afirmar barato y que es donde de verdad se rompe: que los `.otf` no vuelvan, que los
 * `.woff2` sean woff2 de verdad, que `fonts.ts` los apunte, que el peso no se desmadre y
 * que la lista de caracteres necesarios siga escrita.
 */

describe('las fuentes son woff2 subseteados, no los .otf del Brand Book', () => {
  const archivos = readdirSync(dirFuentes);

  test('los cuatro pesos existen como `.woff2` y NINGÚN `.otf` quedó en el repo', () => {
    /*
     * Servir `.otf` al navegador es lo que este cambio vino a arreglar: son 539 KB de los
     * 1,2 MB de la landing medidos en producción. Un `.otf` que reaparezca acá es la
     * regresión, y no falla de ninguna otra forma — la página se ve idéntica, solo pesa.
     */
    for (const peso of ['Regular', 'Medium', 'Semibold', 'Bold']) {
      expect(archivos, peso).toContain(`SF-Pro-Display-${peso}.woff2`);
    }
    expect(archivos.filter((f) => f.endsWith('.otf'))).toEqual([]);
    expect(archivos.filter((f) => f.endsWith('.ttf'))).toEqual([]);
  });

  test('cada peso es un woff2 de verdad (firma `wOF2`), no un otf renombrado', () => {
    // Renombrar la extensión sin convertir daría un archivo que el navegador rechaza en
    // silencio y toda la tipografía caería al fallback — con el mismo peso de antes.
    for (const f of archivos.filter((f) => f.endsWith('.woff2'))) {
      const firma = readFileSync(join(dirFuentes, f)).subarray(0, 4).toString('latin1');
      expect(firma, f).toBe('wOF2');
    }
  });

  test('el subset se mantiene por debajo del presupuesto medido', () => {
    /*
     * 232 KB en total fue la medición que justificó el cambio (539 → 232 en la red). El tope
     * de 300 KB deja aire para un peso extra o un rango más, y falla si alguien vuelve a
     * empaquetar la fuente completa (425 KB) o los `.otf` (1.275 KB).
     *
     * Es un presupuesto, no una medida exacta: un test que exija el byte exacto se rompe al
     * regenerar el subset con otra versión de fontTools sin que nada esté mal.
     */
    const total = archivos
      .filter((f) => f.endsWith('.woff2'))
      .reduce((a, f) => a + statSync(join(dirFuentes, f)).size, 0);
    expect(Math.round(total / 1024)).toBeLessThan(300);
  });

  test('`lib/fonts.ts` apunta a los `.woff2` y no quedó ninguna ruta `.otf`', () => {
    /*
     * Se lee el fuente SIN comentarios. La cabecera de `fonts.ts` cuenta la migración y
     * nombra `.otf` varias veces para explicar de dónde se viene; afirmar sobre el archivo
     * entero verificaría la documentación en vez del código — el error que este repo ya
     * cometió tres veces (el logo del correo, el grid de KPIs, el nav fijo).
     */
    const src = readFileSync(join(raiz, 'lib', 'fonts.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/\.otf/);
    for (const peso of ['Regular', 'Medium', 'Semibold', 'Bold']) {
      expect(src, peso).toContain(`SF-Pro-Display-${peso}.woff2`);
    }
  });

  test('el procedimiento para rehacer el subset está escrito', () => {
    /*
     * Los `.otf` originales NO están en el repo. Sin el README, rehacer el subset obliga a
     * reconstruir los rangos de memoria — y equivocarse ahí se ve en pantalla, no en el
     * build. Se afirma que están los rangos y el motivo de las flechas, que es el detalle
     * que más fácil se pierde.
     */
    const readme = readFileSync(join(dirFuentes, 'README.md'), 'utf8');
    expect(readme).toContain('2190-21FF');
    expect(readme).toMatch(/flechas/i);
    expect(readme).toMatch(/fonttools/i);
  });
});

describe('los caracteres que el subset NO puede perder', () => {
  test('la lista de necesarios cubre los grupos que el producto pinta', () => {
    /*
     * La comprobación glifo a glifo contra el binario la hace el generador (ver README): acá
     * se fija la LISTA, que es la parte que se pierde con el tiempo. Si alguien agrega un
     * idioma o un símbolo nuevo a la interfaz, este test le recuerda dónde declararlo.
     */
    expect(new Set(NECESARIOS).size).toBeGreaterThanOrEqual(110);
    for (const c of ['ñ', '¿', '↗', '↘', '—', '€', '≈']) {
      expect(NECESARIOS, `falta ${c} en la lista de necesarios`).toContain(c);
    }
  });
});
