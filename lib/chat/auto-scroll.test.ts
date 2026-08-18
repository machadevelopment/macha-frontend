import { describe, expect, test } from 'bun:test';
import { comportamientoDeScroll, estaPegadoAlFondo, MARGEN_DE_FONDO } from '@/lib/chat/auto-scroll';

describe('estaPegadoAlFondo', () => {
  const alto = { scrollHeight: 4000, clientHeight: 600 };
  const fondo = alto.scrollHeight - alto.clientHeight; // 3400

  test('exactamente al fondo', () => {
    expect(estaPegadoAlFondo({ ...alto, scrollTop: fondo })).toBe(true);
  });

  test('unos píxeles arriba: sigue contando como abajo', () => {
    expect(estaPegadoAlFondo({ ...alto, scrollTop: fondo - MARGEN_DE_FONDO })).toBe(true);
  });

  test('un pixel más allá del margen: ya no', () => {
    expect(estaPegadoAlFondo({ ...alto, scrollTop: fondo - MARGEN_DE_FONDO - 1 })).toBe(false);
  });

  test('leyendo arriba del todo', () => {
    expect(estaPegadoAlFondo({ ...alto, scrollTop: 0 })).toBe(false);
  });

  test('rebote elástico: scrollTop negativo NO es "abajo"', () => {
    // iOS/trackpad de macOS: arrastrar hacia arriba desde el tope da valores negativos.
    // El usuario está mirando el PRINCIPIO del hilo; empujarlo al fondo sería el bug.
    expect(estaPegadoAlFondo({ ...alto, scrollTop: -60 })).toBe(false);
  });

  test('rebote al final: pasarse del máximo sigue siendo "abajo"', () => {
    expect(estaPegadoAlFondo({ ...alto, scrollTop: fondo + 40 })).toBe(true);
  });

  test('redondeo fraccional del zoom no despega al usuario', () => {
    // Con zoom del navegador la resta da 0.5 o 1.34 aunque la barra esté visualmente al
    // tope. Con umbral 0 se dejaría de auto-scrollear sin que nadie tocara nada.
    expect(estaPegadoAlFondo({ scrollHeight: 4000.5, clientHeight: 600, scrollTop: 3400 })).toBe(
      true,
    );
  });

  test('conversación más corta que la ventana: siempre está abajo', () => {
    // Sin scroll posible, `scrollHeight === clientHeight` y `scrollTop` es 0.
    expect(estaPegadoAlFondo({ scrollHeight: 400, clientHeight: 600, scrollTop: 0 })).toBe(true);
  });
});

describe('comportamientoDeScroll', () => {
  test('al ABRIR un hilo salta, no anima', () => {
    // Un `smooth` de miles de píxeles se cancela solo en cuanto el documento cambia de alto
    // debajo de la animación — que es lo que pasa mientras el Markdown termina de
    // maquetarse. Ese corte a mitad de camino ES el bug reportado.
    expect(comportamientoDeScroll({ abriendo: true, pegadoAlFondo: false })).toBe('auto');
  });

  test('abrir gana sobre la posición previa', () => {
    // Al abrir, "estaba abajo" se refiere al hilo ANTERIOR: preguntarlo daría "no" justo
    // cuando hay que saltar.
    expect(comportamientoDeScroll({ abriendo: true, pegadoAlFondo: false })).toBe('auto');
    expect(comportamientoDeScroll({ abriendo: true, pegadoAlFondo: true })).toBe('auto');
  });

  test('mensaje nuevo estando abajo: anima', () => {
    expect(comportamientoDeScroll({ abriendo: false, pegadoAlFondo: true })).toBe('smooth');
  });

  test('mensaje nuevo mientras el usuario lee arriba: NO se mueve', () => {
    // El criterio explícito del ticket, y lo contrario de lo que hacía antes.
    expect(comportamientoDeScroll({ abriendo: false, pegadoAlFondo: false })).toBeNull();
  });
});

/**
 * La secuencia real de renders al abrir un hilo, que es donde el arreglo se anula solo si
 * uno no la piensa: `messages` pasa por `[]` un instante antes de que llegue la respuesta
 * del fetch. El componente marca el hilo como "ya posicionado" SOLO cuando hay mensajes en
 * pantalla; sin esa condición, el render vacío consumiría la marca y el render con la
 * conversación entraría por la rama de "mensaje nuevo estando abajo" — animando desde
 * arriba, que es el bug reportado, reintroducido por la carrera.
 */
describe('secuencia de apertura de un hilo', () => {
  function simular(pasos: Array<{ hayMensajes: boolean; pegado: boolean }>) {
    let posicionado = false;
    return pasos.map((paso) => {
      const abriendo = !posicionado;
      const decision = comportamientoDeScroll({ abriendo, pegadoAlFondo: paso.pegado });
      if (abriendo && paso.hayMensajes) posicionado = true;
      return decision;
    });
  }

  test('render vacío y luego la conversación: los dos SALTAN, ninguno anima', () => {
    const decisiones = simular([
      // 1) `setMessages([])` al cambiar de hilo. Vacío: `scrollHeight <= clientHeight`,
      //    así que "pegado al fondo" da true — la trampa.
      { hayMensajes: false, pegado: true },
      // 2) llega el fetch con los 40 mensajes del hilo.
      { hayMensajes: true, pegado: false },
    ]);
    expect(decisiones).toEqual(['auto', 'auto']);
  });

  test('ya posicionado, un mensaje nuevo sí anima', () => {
    const decisiones = simular([
      { hayMensajes: false, pegado: true },
      { hayMensajes: true, pegado: false },
      { hayMensajes: true, pegado: true },
    ]);
    expect(decisiones[2]).toBe('smooth');
  });

  test('ya posicionado y leyendo arriba: no se mueve', () => {
    const decisiones = simular([
      { hayMensajes: true, pegado: false },
      { hayMensajes: true, pegado: false },
    ]);
    expect(decisiones).toEqual(['auto', null]);
  });
});
