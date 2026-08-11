/**
 * Disparar la descarga de un CSV desde el navegador — CU-868knx1a0.
 *
 * Separado de `serialize.ts` a propósito: aquello es una función pura que se puede probar
 * con `bun test`, y esto toca `document` y `URL`, que en el runner no existen. Mezclarlos
 * habría obligado a montar un DOM falso solo para poder probar el escapado, que es la
 * parte que de verdad importa probar.
 *
 * No hay endpoint de exportación ni debe haberlo: la tabla ya está entera en memoria
 * (`/api/metrics-products` con `limit=200`), así que pedirle al backend que la vuelva a
 * calcular y serializar sería una segunda consulta al mismo dato, con el riesgo de que el
 * archivo y la pantalla no coincidan si algo cambió entre una y otra.
 */
export function descargarCsv(nombreArchivo: string, contenido: string): void {
  // `charset=utf-8` acompaña al BOM que ya trae el contenido; ninguno de los dos sobra:
  // el tipo MIME lo lee el navegador, el BOM lo lee Excel al abrir el archivo ya guardado.
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  // Firefox ignora el click si el enlace no está en el documento.
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  // Revocar en el siguiente turno del event loop y no aquí mismo: Safari arranca la
  // descarga de forma asíncrona y con la URL ya revocada baja un archivo vacío.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
