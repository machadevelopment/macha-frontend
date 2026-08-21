/**
 * Interruptores de la landing pública (`app/page.tsx`).
 *
 * ═══ POR QUÉ UN MÓDULO Y NO UN `process.env` EN LA PÁGINA ═══
 *
 * Porque una variable de entorno leída suelta no se puede probar ni explicar. Acá el valor
 * tiene UN lugar donde se decide qué cuenta como "encendido", y la página se lee sin tener que
 * saber que existe una variable.
 */

/**
 * ¿Se muestra el botón de "Iniciar sesión" en la landing?
 *
 * Pedido de Keneth (2026-08-21): oculto **por ahora**. Ese "por ahora" es lo que decide que sea
 * un flag y no un borrado — volver a mostrarlo tiene que costar cambiar una variable, no rehacer
 * el botón.
 *
 * ═══ EL DEFAULT ES OCULTO, Y ESO ES LO SEGURO ═══
 *
 * Se exige el string `'true'` exacto. Cualquier otra cosa —ausente, vacío, `'1'`, `'false'`—
 * deja el botón oculto. Es deliberado que el default sea el estado restrictivo: si alguien
 * despliega un entorno nuevo y se olvida de la variable, la landing sale sin invitar a entrar a
 * un producto que todavía no está abierto. El fallo por omisión no debe ser mostrar algo que no
 * se quería mostrar.
 *
 * No se acepta `'1'` a propósito: dos formas de decir sí es la manera de que alguien escriba la
 * que no funciona y concluya que el flag está roto.
 *
 * ═══ ESCONDER EL BOTÓN NO CIERRA LA PUERTA ═══
 *
 * `/login` sigue vivo y funcionando; entrar es escribirlo. Lo que este flag esconde es la
 * INVITACIÓN a entrar, no la entrada. Si algún día hace falta cerrar el acceso de verdad, eso se
 * hace en el middleware o en WorkOS, no acá.
 *
 * ═══ `NEXT_PUBLIC_` SIGNIFICA QUE HACE FALTA REDEPLOYAR ═══
 *
 * El valor queda cocinado en el bundle en tiempo de build, así que cambiar la variable en Vercel
 * no surte efecto hasta un deploy nuevo — y un redeploy que reutilice el cache de build devuelve
 * el valor viejo. Es la misma trampa que nos costó una vuelta con
 * `NEXT_PUBLIC_WORKOS_REDIRECT_URI` el mismo día.
 *
 * Es `NEXT_PUBLIC_` porque la landing se prerenderiza: una variable de servidor obligaría a
 * volverla dinámica para leer un booleano, que es un precio absurdo por un flag de UI.
 */
export function mostrarEntradaEnLanding(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_LOGIN_CTA === 'true';
}
