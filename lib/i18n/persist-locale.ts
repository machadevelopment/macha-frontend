import type { Locale } from '@/lib/i18n/config';

/**
 * Qué hacer para que el idioma elegido llegue al SERVIDOR, y qué hacer si no llega.
 *
 * ═══ POR QUÉ EXISTE (CU-868krvuct) ═══
 *
 * El selector de idioma escribía una cookie y nada más. La cookie solo la lee el frontend,
 * así que el backend nunca se enteraba del cambio — y el contenido que genera la IA (la
 * narrativa de un reporte, las respuestas del asesor) se seguía escribiendo en el idioma
 * que la empresa había elegido el día de su registro, que no se puede editar desde ninguna
 * pantalla. El síntoma que reportó Macha: plataforma en español, reporte en inglés.
 *
 * ═══ POR QUÉ ES UN MÓDULO APARTE Y NO ESTÁ DENTRO DE LA ACCIÓN ═══
 *
 * Dos razones, y la segunda es la que manda:
 *
 *   1. Un archivo `'use server'` solo puede exportar funciones async, así que no hay dónde
 *      poner nada más — es el mismo motivo por el que `ACTIVE_COMPANY_COOKIE` vive fuera
 *      de `set-active-company.ts`.
 *   2. La regla que de verdad importa acá —**que un fallo del backend no impida cambiar de
 *      idioma en pantalla**— es una decisión de producto, y probarla desde la acción exige
 *      fingir `next/headers` y `@/lib/api/client`. En Bun `mock.module` es GLOBAL al
 *      proceso: fingir `@/lib/api/client` rompe `app/api/bff-contract.test.ts`, que barre
 *      todas las rutas BFF ejecutando el `apiFetch` de verdad. Con el envío inyectado, esta
 *      política se prueba sin fingir un solo módulo.
 */
export type ResultadoDeAviso = 'enviado' | 'sin-sesion' | 'fallo';

export async function avisarIdiomaAlServidor(
  locale: Locale,
  accessToken: string | null | undefined,
  enviar: (locale: Locale, accessToken: string) => Promise<unknown>,
): Promise<ResultadoDeAviso> {
  // El selector también aparece en pantallas sin sesión (login, registro). Ahí no hay a
  // quién guardarle la preferencia y la cookie ya hizo todo el trabajo — mandar a login por
  // cambiar de idioma sería absurdo.
  if (!accessToken) return 'sin-sesion';

  try {
    await enviar(locale, accessToken);
    return 'enviado';
  } catch (error) {
    /*
     * El fallo se traga A PROPÓSITO, y no es dejadez.
     *
     * Cambiar de idioma es una acción de interfaz. Si el backend está caído, lo correcto es
     * que la pantalla igual cambie de idioma y que lo único desactualizado sea el idioma de
     * un reporte futuro. Propagar el error dejaría al usuario atrapado en el idioma
     * equivocado por un fallo que no tiene nada que ver con lo que pidió.
     *
     * Es aceptable porque la escritura es idempotente y la preferencia se vuelve a mandar
     * en cada cambio: la próxima vez que toque el selector, se corrige sola. Y queda en el
     * log del servidor, así que no desaparece sin dejar rastro.
     */
    // Se loguea el mensaje, no el Error: en `bun test`, `console.error(..., error)` cuenta
    // el objeto Error como fallo del suite aunque el catch lo haya tragado a propósito.
    console.error(
      '[locale] no se pudo guardar la preferencia en el servidor',
      error instanceof Error ? error.message : error,
    );
    return 'fallo';
  }
}
