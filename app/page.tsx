import { PublicScreen } from '@/components/ui/public-screen';
import { ShowcaseHeading, showcaseCta } from '@/components/ui/showcase';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { mostrarEntradaEnLanding } from '@/lib/landing-flags';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * `macha.finance` — LA LANDING PÚBLICA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Pedido de Keneth, 2026-08-21: `macha.finance` es la landing, con el botón de entrar oculto
 * por ahora, y `macha.finance/login` sigue siendo la puerta para el equipo.
 *
 * ═══ ESTA RUTA HACÍA DOS TRABAJOS Y AHORA HACE UNO ═══
 *
 * Hasta hoy `/` era la portada pública Y el enrutador de post-login: con sesión y empresa
 * redirigía a `/dashboard`, con una invitación pendiente la ofrecía, sin nada mandaba a
 * registrar, y si el backend estaba caído pintaba la salida de emergencia. Toda esa lógica se
 * mudó COMPLETA a `app/continue/page.tsx` — no se reescribió ni se recortó.
 *
 * La mudanza no era opcional: una landing que redirige a quien tiene sesión no es una landing.
 * Y dejar las dos cosas juntas significaba que agregar una sección de marketing te obligaba a
 * pensar en membresías.
 *
 * ═══ ACÁ NO SE LEE LA SESIÓN, Y ES DELIBERADO ═══
 *
 * Ni `getOptionalSession()` ni una sola llamada al backend. Tres consecuencias que se ganan de
 * una vez:
 *
 *   · **La landing no puede caerse porque macha-backend esté caído.** Antes esta ruta consultaba
 *     `/me/memberships`, así que una caída de Railway se llevaba puesta la portada del producto.
 *     Es la peor pantalla para tener acoplada a una API.
 *   · **Es estática de verdad.** Sin lectura de cookies, Next la puede prerenderizar; con
 *     `getOptionalSession()` quedaba dinámica por definición.
 *   · **Un cliente con sesión que escribe `macha.finance` ve la landing**, que es exactamente lo
 *     que Keneth pidió, y quien conozca `/dashboard` entra escribiéndolo.
 *
 * ═══ EL AVISO DE LOGIN FALLIDO SE QUEDA ACÁ ═══
 *
 * `/callback` redirige a `/?auth_error=1` cuando el intercambio código→sesión falla (cancelar
 * el acceso, código expirado, cookie PKCE perdida). Podría haber ido a una pantalla propia y no:
 * quien falla al entrar aterriza en la portada, que es el sitio donde puede volver a intentarlo.
 * Es el único motivo por el que esta página lee un `searchParam`.
 *
 * ═══ QUÉ FALTA ═══
 *
 * El CONTENIDO. Está pendiente el diseño de Figma (16 frames "MACHA HTML LANDING"), así que por
 * ahora se conserva el titular de vitrina que ya existía. La mecánica —rutas, flag, callback— es
 * lo que se resolvió acá y no cambia cuando entre el diseño: el cuerpo se reemplaza y nada más.
 */
export default function Home({ searchParams }: { searchParams?: { auth_error?: string } }) {
  const locale = getLocale();
  const t = getDictionary(locale);
  const authError = searchParams?.auth_error === '1';

  return (
    <PublicScreen locale={locale}>
      <ShowcaseHeading eyebrow={t.home.eyebrow} title={t.home.title} subtitle={t.home.subtitle} />

      {authError && (
        // Color como señal de estado, con texto+fondo+borde juntos (design guide). Rojo
        // funcional y no marca: esto dice "algo salió mal", no "esto es Macha".
        <p
          role="alert"
          className="max-w-[52ch] rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-center text-body text-danger"
        >
          {t.home.authError}
        </p>
      )}

      {/*
        ═══ EL BOTÓN DE ENTRAR ESTÁ APAGADO POR FLAG, NO BORRADO ═══

        Keneth: "botón de login (por ahora oculto)". El "por ahora" es la parte que decide la
        implementación: volver a mostrarlo tiene que costar un cambio de variable, no rehacer el
        botón, el texto y el estilo.

        Que esté oculto NO cierra la puerta: `/login` sigue vivo y entrar es escribirlo. Lo que
        se esconde es la invitación a entrar, no la entrada — el producto todavía no está abierto
        al público, y una portada con "Iniciar sesión" promete algo que no puede cumplir.

        Y si el aviso de login fallido está en pantalla, el botón se muestra IGUAL aunque el flag
        esté apagado: alguien que acaba de fallar al entrar ya sabe que la puerta existe, y
        dejarlo con un mensaje de error sin nada que apretar es el peor de los dos mundos.
      */}
      {(mostrarEntradaEnLanding() || authError) && (
        /*
          `/login` en vez de `await getSignInUrl()`: esa función escribe la cookie PKCE
          (`getAuthURLAndSetPKCECookie`), y Next.js solo permite mutar cookies en Server Actions
          y Route Handlers — desde acá lanzaba y `/` devolvía 500. Hay test que lo fija
          (`app/auth-entrypoint.test.ts`). Ver `app/login/route.ts`.
        */
        <a href="/login" className={showcaseCta}>
          {t.common.signIn}
        </a>
      )}
    </PublicScreen>
  );
}
