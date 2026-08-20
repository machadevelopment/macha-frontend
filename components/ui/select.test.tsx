import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CU-868ku9rpy — la guarda que impide que vuelvan los desplegables a mano.
 *
 * La auditoría encontró `<select>` escritos a mano en OCHO archivos, con cuatro
 * combinaciones de clases distintas para el mismo control: cuatro fondos, dos tokens de
 * borde, tres rellenos. Ninguna se ve mal por sí sola — la diferencia solo aparece cuando
 * dos caen en la misma sesión, que es cuando alguien reporta que "la app se ve
 * inconsistente" sin poder señalar dónde.
 *
 * Un comentario en `components/ui/select.tsx` no lo evita: el próximo `<select>` va a
 * compilar, pasar lint y verse bien en su pantalla. Este test es lo que lo detiene.
 */

/** Todos los `.tsx` de la app, menos las primitivas y los propios tests. */
function archivosDeApp(): string[] {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) {
        if (entrada === 'node_modules' || entrada === '.next') continue;
        recorrer(ruta);
        continue;
      }
      if (!entrada.endsWith('.tsx')) continue;
      if (entrada.includes('.test.')) continue;
      // La primitiva ES el `<select>` legítimo, y el shell/dropdown de Radix tiene el suyo.
      if (ruta.includes(join('components', 'ui'))) continue;
      salida.push(ruta);
    }
  };
  recorrer('components');
  recorrer('app');
  return salida;
}

describe('el desplegable del sistema es el único', () => {
  test('ningún archivo de la app usa `<select>` crudo', () => {
    const culpables = archivosDeApp().filter((f) => /<select[\s>]/.test(readFileSync(f, 'utf8')));

    expect(culpables).toEqual([]);
  });

  test('ningún `<Select>` reescribe su borde, fondo o relleno', () => {
    /*
     * El otro camino de vuelta al problema: usar la primitiva y anularla con `className`.
     * Se buscan las clases que la primitiva ya define; un `className` para el ancho o un
     * margen es legítimo y no cae acá.
     */
    const reglaDeEstilo =
      /className="[^"]*\b(?:rounded-md|border-(?:border|input)|bg-(?:surface|card|background)|px-\d)\b[^"]*"/;
    const culpables = archivosDeApp().filter((f) => {
      const texto = readFileSync(f, 'utf8');
      return texto
        .split('<Select')
        .slice(1)
        .some((trozo) => {
          const etiqueta = trozo.slice(0, trozo.indexOf('>'));
          return reglaDeEstilo.test(etiqueta);
        });
    });

    expect(culpables).toEqual([]);
  });
});
