/**
 * El destino de "Solicitar demo".
 *
 * ═══ HOY ES UN `mailto`, Y ESTÁ DECIDIDO ASÍ A PROPÓSITO ═══
 *
 * Keneth pidió `mailto` a `contact@machafinance.com`; Jose agregó que "igual debería ir un form
 * básico para que pongan datos básicos". Las dos cosas son ciertas y no se contradicen: el
 * formulario es mejor, y el `mailto` es lo que funciona HOY sin nada detrás.
 *
 * Lo que un formulario necesita antes de existir, y que no está: un endpoint PÚBLICO —sin sesión,
 * o sea el primer endpoint del producto que cualquiera en internet puede llamar—, límite por IP
 * para que no sea un buzón de spam, y alguien leyendo los leads. El `mailto` no tiene ninguno de
 * esos problemas y, sobre todo, NO PUEDE FALLAR EN SILENCIO: si el correo no sale, quien lo
 * escribió lo ve en su propio cliente. Un formulario roto se traga el lead sin que nadie note.
 *
 * ═══ EL ASUNTO VA PRELLENADO ═══
 *
 * Es la diferencia entre un correo que se contesta y uno que llega sin contexto. Se pasa desde el
 * diccionario porque cambia con el idioma de la landing: quien la lee en inglés escribe en inglés.
 *
 * `encodeURIComponent` no es decorativo: el asunto lleva espacios y acentos, y sin codificar el
 * `mailto` se corta en el primer espacio en varios clientes.
 */
export const CORREO_DEMO = 'contact@machafinance.com';

export function enlaceDemo(asunto: string): string {
  return `mailto:${CORREO_DEMO}?subject=${encodeURIComponent(asunto)}`;
}
