import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * SIN CRÉDITOS, EL CHAT LO DICE — Y NO PIERDE LO QUE ESCRIBISTE (CU-868kxjucv)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * El chat cobraba un crédito por prompt (CU-868kx4gzx) pero **no bloqueaba**, así que una
 * empresa sin saldo seguía usando el asesor y su balance se iba a negativo — el mismo hueco que
 * ya dejó empresas en −1.675 créditos por el lado de la ingesta.
 *
 * Bloquear una conversación es más brusco que negar un consejo, y lo que lo hace tolerable son
 * dos propiedades que este archivo fija, porque las dos se pueden romper sin que nada falle:
 *
 *   1. el mensaje que escribiste **vuelve al compositor**;
 *   2. la pantalla dice **que faltan créditos**, no "algo salió mal".
 */
const chat = readFileSync(join(import.meta.dir, 'chat-client.tsx'), 'utf8');

describe('el chat sin créditos', () => {
  test('distingue el 402 de un fallo de red', () => {
    /*
     * Se exigen el status Y el marcador del cuerpo. El status solo sería frágil —cualquier otro
     * 402 futuro caería acá— y el cuerpo solo también: un proxy puede devolver un cuerpo con esa
     * forma en un error que no es este. Es el mismo par que verifica el panel del Consejo Diario.
     */
    expect(chat).toContain('error.status !== 402');
    expect(chat).toContain("body?.error === 'insufficient_credits'");
  });

  test('ofrece comprar créditos, que es lo único accionable', () => {
    expect(chat).toContain('labels.insufficientCredits');
    expect(chat).toContain('href="/credits"');
  });

  /*
   * LA PROPIEDAD QUE HACE TOLERABLE EL CORTE. Si alguien quita este `setDraft(content)`, el
   * usuario pierde lo que escribió justo cuando le dicen que no se envió — y ya no hay forma de
   * recuperarlo. No falla ningún test de los otros: la pantalla se ve bien y el texto se fue.
   */
  /*
   * ⚠️ EL ANCLA COSTÓ DOS INTENTOS Y VALE ANOTARLO, porque es el modo de fallo típico de un
   * test que lee el fuente: buscar una cadena que aparece MÁS DE UNA VEZ.
   *
   * Primero anclé en `if (!result.ok) {` — el primero del archivo es el de cargar los hilos.
   * Después en `setSendError(result.error)` — hay dos, y el primero también es de otro
   * handler. El único punto inequívoco es el retiro del mensaje optimista, que solo existe en
   * el camino de error del ENVÍO.
   *
   * Las dos veces el test falló por mirar el sitio equivocado, no por lo que afirmaba. Un test
   * de fuente vale lo que vale su ancla.
   */
  const manejadorDeEnvio = (() => {
    const inicio = chat.indexOf('setMessages((prev) => prev.slice(0, -1))');
    expect(inicio).toBeGreaterThan(-1);
    return chat.slice(inicio, inicio + 300);
  })();

  test('el borrador vuelve al compositor cuando el envío falla', () => {
    expect(manejadorDeEnvio).toContain('setDraft(content)');
  });

  test('y el mensaje optimista se retira, para no aparentar que quedó registrado', () => {
    expect(manejadorDeEnvio).toContain('setMessages((prev) => prev.slice(0, -1))');
  });

  /*
   * El error genérico sigue existiendo para lo que SÍ es un fallo. Sin esta comprobación, alguien
   * podría reemplazar `LoadError` por el mensaje de créditos y entonces una caída de red diría
   * "te quedaste sin créditos" — mandando a pagar por un problema ajeno.
   */
  test('un fallo que NO es de créditos sigue mostrando el error genérico', () => {
    expect(chat).toContain('<LoadError error={sendError} labels={common.loadError} />');
  });
});
