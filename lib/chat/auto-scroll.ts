/**
 * Reglas del auto-scroll de la conversación — CU-868kt9e92.
 *
 * ═══ EL BUG ═══
 *
 * Macha reportó que al abrir un chat el scroll se queda en la PRIMERA pregunta y hay que
 * bajar a mano hasta la última. El auto-scroll existía desde CU-868krvtya, así que el
 * ticket parecía ya resuelto — no lo estaba, y por dos motivos distintos:
 *
 *  1. **Se hacía SIEMPRE con `behavior: 'smooth'`.** Abrir un hilo largo dispara una
 *     animación de miles de píxeles desde arriba, y esa animación se cancela sola en
 *     cuanto el documento cambia de alto debajo de ella — que es exactamente lo que pasa
 *     mientras el Markdown de cada respuesta termina de maquetarse. El resultado es un
 *     scroll que arranca, se corta a mitad de camino y deja al usuario en cualquier parte
 *     del hilo. Un chat que ABRE no anima: salta. Claude, ChatGPT y WhatsApp saltan.
 *
 *  2. **No respetaba al usuario que subió a leer.** El efecto se disparaba con cada
 *     cambio de `messages`, así que leer un mensaje viejo mientras llegaba una respuesta
 *     te arrancaba de donde estabas. El ticket lo pide explícitamente y era lo contrario
 *     de lo que hacía.
 *
 * ═══ POR QUÉ ESTAS FUNCIONES VIVEN FUERA DEL COMPONENTE ═══
 *
 * Son las dos decisiones del comportamiento —"¿está pegado abajo?" y "¿salto o animo?"— y
 * son aritmética pura sobre tres números. Adentro de un `useEffect` solo se pueden probar
 * montando un DOM con alturas reales; acá se prueban con una tabla de casos, incluidos los
 * que en un navegador cuestan de reproducir (el rebote elástico de iOS, el redondeo
 * fraccional del zoom).
 */

/**
 * Margen, en píxeles, dentro del cual se considera que el usuario "está abajo".
 *
 * No es cero, y el motivo no es tolerancia estética. Con zoom del navegador o en pantallas
 * de alta densidad, `scrollHeight - scrollTop - clientHeight` da valores fraccionarios
 * (0.5, 1.34…) aunque la barra esté visualmente al tope; con umbral 0, un usuario pegado al
 * fondo dejaría de recibir el auto-scroll sin haber tocado nada.
 *
 * 80px es además la altura aproximada de un par de renglones: si alguien subió menos que
 * eso, seguía leyendo el final y quiere que lo sigan empujando.
 */
export const MARGEN_DE_FONDO = 80;

export interface MetricasDeScroll {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * ¿La vista está pegada al final de la conversación?
 *
 * `scrollTop` puede venir NEGATIVO (rebote elástico al arrastrar hacia arriba en iOS y en
 * trackpads de macOS) y puede pasarse del máximo por el mismo rebote al final. Las dos
 * situaciones significan "el usuario está en el borde", así que la resta se compara contra
 * el umbral sin normalizar nada: un valor negativo es aún más "arriba" que cero, y uno que
 * se pasa del máximo es aún más "abajo".
 */
export function estaPegadoAlFondo(m: MetricasDeScroll, margen = MARGEN_DE_FONDO): boolean {
  return m.scrollHeight - m.scrollTop - m.clientHeight <= margen;
}

/**
 * Qué scroll corresponde. Devuelve `null` cuando NO hay que mover nada — que es el caso
 * que el ticket pide y que antes no existía.
 *
 * `abriendo` gana sobre todo lo demás: al abrir un hilo la posición previa no significa
 * nada (es la del hilo ANTERIOR, o cero), así que preguntar "¿estaba abajo?" no tiene
 * sentido y la respuesta sería "no" justo cuando hay que saltar.
 */
export function comportamientoDeScroll(params: {
  abriendo: boolean;
  pegadoAlFondo: boolean;
}): ScrollBehavior | null {
  if (params.abriendo) return 'auto';
  return params.pegadoAlFondo ? 'smooth' : null;
}
