import { ShowcaseFrame } from '@/components/ui/showcase';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingCta } from '@/components/landing/landing-cta';
import { SeccionProducto } from '@/components/landing/landing-producto';
import { SeccionCapacidades, SeccionFaq } from '@/components/landing/landing-acordeones';
import {
  SeccionPorque,
  SeccionComo,
  SeccionAsesor,
  SeccionAutomatizacion,
  SeccionAntesDespues,
  SeccionSeguridad,
  SeccionPlanes,
} from '@/components/landing/landing-secciones';
import { enlaceDemo } from '@/components/landing/demo-link';
import { LandingFooter } from '@/components/landing/landing-footer';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * `macha.finance` — LA LANDING PÚBLICA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Pedido de Keneth, 2026-08-21: `macha.finance` es la landing, el botón de entrar oculto por
 * ahora, y `macha.finance/login` como puerta del equipo.
 *
 * El diseño sale del Figma `4aOl3snsDmFRsRQdOGM8z2`, leído por la API. Los 16 frames de ese
 * archivo NO son variantes a elegir ni copias: son la MISMA página con un item distinto abierto en
 * los acordeones, o sea la especificación completa de esos dos estados. Ver más abajo.
 *
 * ═══ ESTA RUTA HACÍA DOS TRABAJOS Y AHORA HACE UNO ═══
 *
 * Hasta hace poco `/` era la portada Y el enrutador de post-login: redirigía a `/dashboard`,
 * ofrecía la invitación pendiente, mandaba a registrar o pintaba la salida de emergencia con el
 * backend caído. Todo eso vive en `app/continue/page.tsx`, y `/callback` apunta ahí.
 *
 * ═══ ACÁ NO SE LEE LA SESIÓN ═══
 *
 * Ni `getOptionalSession()` ni una llamada al backend, y hay test que lo fija. Tres cosas se
 * ganan juntas: la landing no puede caerse porque Railway esté caído (antes consultaba
 * `/me/memberships`, o sea que una caída del backend se llevaba la portada del producto), Next la
 * puede prerenderizar, y un cliente con sesión que escribe `macha.finance` ve la landing —
 * exactamente lo que se pidió.
 *
 * ═══ LAS 14 SECCIONES, Y LO QUE COSTÓ LEERLAS BIEN ═══
 *
 * Están las catorce del diseño. La primera versión de esta página traía solo cuatro, porque leí
 * un solo frame del Figma y descarté los otros 15 como copias con ruido.
 *
 * Era falso, y Keneth lo corrigió: cada frame tiene UN item distinto abierto en los acordeones.
 * Las diferencias de 1 a 24 líneas que tomé por ruido eran precisamente el contenido del item
 * expandido. Medido después: 190 textos son comunes a los 16 frames y 47 varían — y esos 47 son
 * los estados de los dos acordeones. Cruzándolos salen los 5 items de capacidades con sus dos
 * insights cada uno y las 6 preguntas del FAQ con su respuesta.
 *
 * O sea que los 16 frames no eran redundancia: eran la especificación completa, y usar uno solo
 * dejaba cada acordeón con un item lleno y el resto vacío.
 *
 * Solo dos secciones llevan estado de cliente (`landing-acordeones.tsx`); el resto es estático y
 * se prerenderiza.
 */
export default function Home({ searchParams }: { searchParams?: { auth_error?: string } }) {
  const locale = getLocale();
  const t = getDictionary(locale);
  const authError = searchParams?.auth_error === '1';

  return (
    <ShowcaseFrame className="min-h-dvh">
      {/*
        `comfortable` y no `compact`: la landing no es una pantalla de datos. Y el ancho sale de
        medir el diseño — el contenido del Figma va de x=375 a x=1545 sobre 1920, o sea 1170px de
        caja centrada.
      */}
      <div
        data-density="comfortable"
        className="mx-auto flex min-h-dvh max-w-[1170px] flex-col px-6 py-6 app:px-8"
      >
        <LandingNav
          locale={locale}
          labels={t.landing}
          common={t.common}
          anclas={['como-funciona', 'planes', 'faq']}
        />

        {authError && (
          /*
            El aviso de login fallido. `/callback` redirige acá con `?auth_error=1` cuando el
            intercambio código→sesión no sale (cancelar el acceso, código expirado, cookie PKCE
            perdida).

            Va ARRIBA y con el enlace a `/login` al lado, aunque el flag del botón esté apagado:
            quien acaba de fallar al entrar ya sabe que la puerta existe, y dejarlo con un
            mensaje de error y nada que apretar es el peor de los dos mundos.

            Color como señal de estado con texto, fondo y borde juntos (design guide). Rojo
            funcional, no marca: dice "algo salió mal", no "esto es Macha".
          */
          <p
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-center gap-x-2 rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-center text-body text-danger"
          >
            {t.home.authError}
            <a href="/login" className="font-semibold underline underline-offset-2">
              {t.common.signIn}
            </a>
          </p>
        )}

        {/*
          Las 14 secciones en el orden del diseño. El `gap` es lo que da el ritmo de la página:
          en el Figma la separación entre secciones ronda los 200px a 1920, y `gap-28` (112px) con
          el `app:gap-40` (160px) de arriba se le acerca sin dejar huecos enormes en móvil, donde
          el mismo aire se lee como una página vacía.
        */}
        <div className="mt-16 flex flex-col gap-28 app:mt-24 app:gap-40">
          <LandingHero labels={t.landing} />
          <SeccionPorque labels={t.landing} />
          <SeccionComo labels={t.landing} />
          <SeccionProducto labels={t.landing} />
          <SeccionCapacidades labels={t.landing} />
          <SeccionAsesor labels={t.landing} />
          <SeccionAutomatizacion labels={t.landing} />
          <SeccionAntesDespues labels={t.landing} />
          <SeccionSeguridad labels={t.landing} />
          <SeccionPlanes labels={t.landing} hrefDemo={enlaceDemo(t.landing.demoAsunto)} />
          <SeccionFaq labels={t.landing} />
          <LandingCta labels={t.landing} />
        </div>

        <LandingFooter labels={t.landing} />
      </div>
    </ShowcaseFrame>
  );
}
