import { describe, expect, it } from 'bun:test';
import { BOM, csvField, csvFileName, serializeCsv, toCsv } from './serialize';

/**
 * CU-868knx1a0. El escapado del CSV es la clase de código que nunca falla ruidosamente:
 * el archivo se descarga, se abre, y las columnas están corridas a partir de la fila del
 * producto que traía una coma en el nombre. Nadie lo ve hasta que las cifras no cuadran.
 *
 * Por eso además de los casos sueltos hay un test de ida y vuelta: se serializa, se vuelve
 * a leer con un parser RFC 4180 escrito aquí a propósito (independiente de la
 * implementación) y se exige recuperar exactamente los mismos valores. Eso cubre las
 * combinaciones que a mano no se listan —comilla dentro de un campo que ya lleva coma,
 * campo que es solo comillas, salto de línea pegado al final—.
 */

/** Parser RFC 4180 mínimo, solo para el test. No comparte código con `toCsv`. */
function parseCsv(texto: string): string[][] {
  const filas: string[][] = [[]];
  let campo = '';
  let dentroDeComillas = false;
  let i = 0;

  while (i < texto.length) {
    const c = texto[i]!;
    if (dentroDeComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i += 2;
          continue;
        }
        dentroDeComillas = false;
        i += 1;
        continue;
      }
      campo += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      dentroDeComillas = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      filas.at(-1)!.push(campo);
      campo = '';
      i += 1;
      continue;
    }
    if (c === '\r' && texto[i + 1] === '\n') {
      filas.at(-1)!.push(campo);
      campo = '';
      filas.push([]);
      i += 2;
      continue;
    }
    campo += c;
    i += 1;
  }
  filas.at(-1)!.push(campo);
  return filas;
}

describe('csvField — escapado de una celda', () => {
  it('deja intacto lo que no necesita comillas', () => {
    expect(csvField('Café molido')).toBe('Café molido');
  });

  it('entrecomilla un valor con coma: sin esto la fila gana una columna fantasma', () => {
    expect(csvField('Café, molido')).toBe('"Café, molido"');
  });

  it('duplica la comilla doble y entrecomilla el campo', () => {
    // Duplicar (`""`) es lo que dice RFC 4180. Escaparla con backslash —el reflejo de
    // quien viene de JSON— no lo entiende ningún lector de CSV.
    expect(csvField('Tornillo 1/2"')).toBe('"Tornillo 1/2"""');
  });

  it('entrecomilla saltos de línea: sin esto una celda se convierte en dos FILAS', () => {
    expect(csvField('Servicio\nmensual')).toBe('"Servicio\nmensual"');
    expect(csvField('Servicio\r\nmensual')).toBe('"Servicio\r\nmensual"');
    expect(csvField('Servicio\rmensual')).toBe('"Servicio\rmensual"');
  });

  it('null y undefined dan celda VACÍA, nunca la palabra "null"', () => {
    // Esta es la distinción de la que depende la regla de unidades de Ventas por producto:
    // vacío = "el archivo del cliente no traía el dato". Un "null" impreso, o peor un 0,
    // sería un dato inventado.
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
  });

  it('la cadena vacía no se entrecomilla', () => {
    expect(csvField('')).toBe('');
  });
});

describe('toCsv — filas', () => {
  it('separa con coma y termina las filas en CRLF', () => {
    expect(toCsv([['a', 'b'], ['c']])).toBe('a,b\r\nc');
  });

  it('no agrega salto al final: un lector ingenuo lo leería como una fila vacía de más', () => {
    expect(toCsv([['a']])).toBe('a');
  });

  it('una tabla vacía no revienta', () => {
    expect(toCsv([])).toBe('');
  });
});

describe('serializeCsv — lo que se descarga', () => {
  it('arranca con el BOM, o Excel en español abre los acentos rotos', () => {
    const salida = serializeCsv([['Café']]);
    expect(salida.startsWith(BOM)).toBe(true);
    // Se afirma por código de carácter y no comparando contra el literal: el BOM es
    // invisible en el editor, y una aserción escrita con él no se puede revisar a ojo.
    expect(salida.charCodeAt(0)).toBe(0xfeff);
  });
});

describe('ida y vuelta: lo serializado se vuelve a leer igual', () => {
  const NOMBRES_HOSTILES = [
    'Café, molido',
    'Tornillo 1/2"',
    'Bolsa "premium", 5kg',
    'Servicio\nmensual',
    'Servicio\r\nmensual',
    '"',
    '""',
    ',',
    '',
    'sin nada raro',
    '  espacios al borde  ',
    'Ñandú & Cía. — 50% dto.',
  ];

  it.each(NOMBRES_HOSTILES)('sobrevive el valor %j', (valor) => {
    const original = [
      ['Producto', 'Ingreso'],
      [valor, 'GTQ 1,234.00'],
    ];
    expect(parseCsv(toCsv(original))).toEqual(original);
  });

  it('sobrevive una tabla entera con todos los casos hostiles a la vez', () => {
    const original = [
      ['Producto', 'Categoría', 'Unidades'],
      ...NOMBRES_HOSTILES.map((n) => [n, 'Sin clasificar', '']),
    ];
    expect(parseCsv(toCsv(original))).toEqual(original);
  });
});

describe('csvFileName', () => {
  it('mete el rango de fechas en el nombre', () => {
    expect(csvFileName('ventas-por-producto', { from: '2026-08-01', to: '2026-08-31' })).toBe(
      'ventas-por-producto_2026-08-01_2026-08-31.csv',
    );
  });

  it('el rango va en ISO para que la carpeta se ordene sola por período', () => {
    const abril = csvFileName('x', { from: '2026-04-01', to: '2026-04-30' });
    const agosto = csvFileName('x', { from: '2026-08-01', to: '2026-08-31' });
    expect([agosto, abril].sort()).toEqual([abril, agosto]);
  });

  it('quita tildes, espacios y todo lo que no sobreviva a un sistema de archivos', () => {
    expect(csvFileName('Ventas por categoría', { from: '2026-01-01', to: '2026-01-31' })).toBe(
      'ventas-por-categoria_2026-01-01_2026-01-31.csv',
    );
    expect(csvFileName('a/b:c*d?', { from: '2026-01-01', to: '2026-01-31' })).toBe(
      'a-b-c-d_2026-01-01_2026-01-31.csv',
    );
  });
});
