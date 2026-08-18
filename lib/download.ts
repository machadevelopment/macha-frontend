/**
 * Abre un archivo que vive en S3 detrás de una URL firmada — CU-868kt4bxc.
 *
 * ═══ EL BUG ═══
 *
 * Macha reportó que al descargar el reporte en PDF "sale en una ventana pop-up". Era
 * literal: las tres descargas del producto usaban `window.open(url, \'_blank\')`.
 *
 * Eso trae dos problemas, y el segundo es peor que la incomodidad:
 *
 *   1. **Los navegadores lo bloquean.** Un `window.open` solo sobrevive si el navegador
 *      lo considera resultado directo de un clic. Acá NO lo es: entre el clic y la
 *      apertura hay un `await` para pedir la URL firmada al backend, y en ese salto se
 *      pierde la "activación del usuario". Chrome y Safari lo tratan como pop-up no
 *      solicitado y lo bloquean **en silencio** — el usuario hace clic y no pasa nada.
 *   2. Y cuando no lo bloquea, deja una pestaña en blanco abierta.
 *
 * ═══ EL ARREGLO ═══
 *
 * Un `<a download>` sintético. No abre ventana, no lo bloquea el navegador porque no es
 * una ventana nueva, y le da al archivo un **nombre de verdad** en vez del hash de S3 que
 * trae la URL firmada.
 *
 * `download` es una PISTA, no una orden: si el servidor manda
 * `Content-Disposition: inline`, el navegador puede abrirlo igual. Para un PDF eso es
 * aceptable —se ve en el visor, en la misma pestaña, que es justo lo que el ticket pide en
 * vez del pop-up—; el Excel se descarga siempre porque ningún navegador lo renderiza.
 *
 * El anchor se crea, se dispara y se quita en la misma vuelta: dejarlo en el DOM sería un
 * elemento invisible acumulándose por cada descarga.
 */
export function descargarArchivo(url: string, nombreSugerido: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreSugerido;
  // `rel` por el mismo motivo que llevaba el `window.open`: la URL apunta a S3, que es
  // otro origen, y sin esto la página destino puede alcanzar `window.opener`.
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Nombre de archivo para una descarga de reporte.
 *
 * Sin esto el archivo se guarda con el nombre que trae la URL firmada de S3 —un uuid— y
 * una carpeta de descargas con cinco reportes se vuelve ilegible. Con el período adentro,
 * el nombre dice qué es sin abrirlo.
 */
export function nombreDeReporte(params: {
  desde?: string;
  hasta?: string;
  formato: 'pdf' | 'xlsx';
}): string {
  const rango = params.desde && params.hasta ? `-${params.desde}_${params.hasta}` : '';
  return `macha-reporte${rango}.${params.formato}`;
}
