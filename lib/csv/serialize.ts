/**
 * Serialización de CSV (RFC 4180) — CU-868knx1a0.
 *
 * Vive en `lib/` y no dentro de la pantalla que lo estrenó porque el escapado es la parte
 * que se rompe EN SILENCIO: un archivo con un nombre de producto que trae una coma no
 * falla al descargarse ni avisa nada; abre en Excel con las columnas corridas a partir de
 * esa fila, y el dueño lo descubre cuadrando cifras que no cuadran. Aislarlo aquí es lo
 * que permite probarlo (`serialize.test.ts`) en vez de confiar en la revisión visual.
 *
 * Las tres reglas de RFC 4180 que aplican, y por qué ninguna es opcional:
 *  · Un campo se entrecomilla si contiene coma, comilla doble, `\n` o `\r`. La coma parte
 *    la fila en dos; el salto de línea la parte en dos FILAS, que es peor porque el
 *    archivo sigue pareciendo válido.
 *  · Dentro de comillas, una comilla doble se escribe duplicada (`""`). Escaparla con
 *    backslash —el reflejo de quien viene de JSON— no lo entiende ningún lector de CSV.
 *  · Las filas terminan en CRLF. Excel lee ambos, pero CRLF es lo que dice la norma y lo
 *    que evita sorpresas en Windows, que es donde está la contabilidad de la PYME.
 */

/** Un valor de celda. `null`/`undefined` significan "no hay dato", no cadena vacía. */
export type CsvValue = string | null | undefined;

/**
 * Excel en español no detecta UTF-8 por su cuenta: sin BOM abre el archivo en la
 * codificación del sistema (Windows-1252) y toda tilde o eñe sale rota — "Café" queda
 * "CafÃ©". El BOM es el único aviso que ese Excel respeta.
 */
export const BOM = '\uFEFF';

const SEPARADOR = ',';
const FIN_DE_FILA = '\r\n';

/** Coma (separador), comilla doble (delimitador) y saltos de línea (fin de fila). */
const NECESITA_COMILLAS = /[",\r\n]/;

/**
 * Escapa UNA celda.
 *
 * `null`/`undefined` producen celda vacía —no la cadena `"null"`, que es el descuido
 * clásico de concatenar sin pensar—. Esa distinción es la que sostiene la regla de
 * unidades de esta pantalla: vacío significa "el archivo no traía el dato", y tiene que
 * poder distinguirse de un 0 que sí se midió.
 */
export function csvField(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  return NECESITA_COMILLAS.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Serializa las filas ya escapadas. Sin salto final: un lector ingenuo lo leería como una fila vacía de más. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvValue>>): string {
  return rows.map((fila) => fila.map(csvField).join(SEPARADOR)).join(FIN_DE_FILA);
}

/** El contenido tal cual se descarga: BOM + filas. */
export function serializeCsv(rows: ReadonlyArray<ReadonlyArray<CsvValue>>): string {
  return BOM + toCsv(rows);
}

/**
 * Nombre del archivo, con el rango de fechas dentro.
 *
 * El rango va en ISO (`2026-08-01_2026-08-31`) y NO por `formatDate`, a diferencia de todo
 * lo que se pinta en pantalla. No es una fecha que el usuario lee como fecha: es parte de
 * un identificador. En `es-GT` `formatDate` da "1 ago 2026" —espacios, y un orden que
 * hace que el explorador de archivos liste agosto antes que abril—, así que quien exporta
 * el mismo reporte cada mes termina con una carpeta que no se puede ordenar. En ISO se
 * ordena solo, que es justo para lo que sirve la fecha en un nombre de archivo.
 */
export function csvFileName(base: string, rango: { from: string; to: string }): string {
  const slug = base
    .normalize('NFD')
    // Los diacríticos que `NFD` acaba de separar de su letra (á -> a + U+0301).
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}_${rango.from}_${rango.to}.csv`;
}
