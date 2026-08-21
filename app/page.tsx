import { ShowcaseFrame } from '@/components/ui/showcase';
import { Banda } from '@/components/landing/banda';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingCta } from '@/components/landing/landing-cta';
import { SeccionProducto } from '@/components/landing/landing-producto';
import { SeccionCapacidades, SeccionFaq } from '@/components/landing/landing-acordeones';
import { SeccionAsesor } from '@/components/landing/landing-asesor';
import {
  SeccionPorque,
  SeccionComo,
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
 * El diseño sale del Figma `4aOl3snsDmFRsRQdOGM8z2`. Los 16 frames de ese archivo NO son
 * variantes a elegir ni copias: son la MISMA página con un item distinto abierto en los
 * acordeones, o sea la especificación completa de esos estados. Ver más abajo.
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
 * ═══ LA ESTRUCTURA SON BANDAS, Y ESO FUE EL SEGUNDO REPORTE ═══
 *
 * La primera versión metía las catorce secciones en UN contenedor de 1170px separadas por `gap`.
 * Keneth lo reportó como "hay partes que tienen color negro y así, falta bastante trabajo": en el
 * diseño los fondos ALTERNAN entre el lienzo y un gris casi blanco, y una sección —el asesor con
 * IA— va sobre tinta de borde a borde. Sin bandas la página se leía como un documento largo, y la
 * única sección que cambia de color simplemente no existía.
 *
 * Ahora cada sección va envuelta en `<Banda>`, que pone el fondo a todo el ancho y acota el
 * contenido al centro. El orden y el tono de abajo salen de medir el frame; la tabla completa está
 * en `banda.tsx`. Las secciones no conocen su color: por eso la oscura es la misma pieza que las
 * claras, con `.inverse` redefiniendo los tokens hacia adentro.
 *
 * ═══ LAS 14 SECCIONES, Y LO QUE COSTÓ LEERLAS BIEN ═══
 *
 * La primera versión traía solo cuatro, porque leí un frame del Figma y descarté los otros 15 como
 * copias con ruido.
 *
 * Era falso, y Keneth lo corrigió: cada frame tiene UN item distinto abierto. Las diferencias de 1
 * a 24 líneas que tomé por ruido eran el contenido del item expandido. Medido: 190 textos son
 * comunes a los 16 frames y 47 varían — y esos 47 son los estados de los DOS acordeones y de las
 * pestañas del asesor. Cruzándolos salen los 5 items de capacidades con sus dos insights, las 6
 * preguntas del FAQ y las 3 del asesor.
 *
 * O sea que los 16 frames no eran redundancia: eran la especificación completa, y usar uno solo
 * dejaba cada acordeón con un item lleno y el resto vacío.
 *
 * Solo tres secciones llevan estado de cliente (los dos acordeones y el asesor); el resto es
 * estático y se prerenderiza.
 */
export default function Home({ searchParams }: { searchParams?: { auth_error?: string } }) {
  const locale = getLocale();
  const t = getDictionary(locale);
  const authError = searchParams?.auth_error === '1';

  return (
    <ShowcaseFrame className="min-h-dvh">
      {/* `comfortable` y no `compact`: la landing no es una pantalla de datos. */}
      <div data-density="comfortable" className="flex min-h-dvh flex-col">
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
            quien acaba de fallar al entrar ya sabe que la puerta existe, y dejarlo con un mensaje
            de error y nada que apretar es el peor de los dos mundos.

            Color como señal de estado con texto, fondo y borde juntos (design guide). Rojo
            funcional, no marca: dice "algo salió mal", no "esto es Macha".
          */
          <div className="mx-auto w-full max-w-[1170px] px-6 pt-6 app:px-8">
            <p
              role="alert"
              className="flex flex-wrap items-center justify-center gap-x-2 rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-center text-body text-danger"
            >
              {t.home.authError}
              <a href="/login" className="font-semibold underline underline-offset-2">
                {t.common.signIn}
              </a>
            </p>
          </div>
        )}

        {/*
          Las 14 secciones en el orden del diseño, con el tono de banda medido de cada una. El
          hero lleva `id="inicio"` porque es a donde apunta el primer enlace del nav.
        */}
        <main>
          <Banda id="inicio">
            <LandingHero labels={t.landing} />
          </Banda>

          <Banda tono="sutil">
            <SeccionPorque labels={t.landing} />
          </Banda>

          <Banda id="como-funciona">
            <SeccionComo labels={t.landing} />
          </Banda>

          <Banda tono="sutil">
            <SeccionProducto labels={t.landing} />
          </Banda>

          <Banda>
            <SeccionCapacidades labels={t.landing} />
          </Banda>

          <Banda tono="tinta">
            <SeccionAsesor labels={t.landing} />
          </Banda>

          <Banda>
            <SeccionAutomatizacion labels={t.landing} />
          </Banda>

          <Banda tono="sutil">
            <SeccionAntesDespues labels={t.landing} />
          </Banda>

          <Banda>
            <SeccionSeguridad labels={t.landing} />
          </Banda>

          <Banda id="planes" tono="sutil">
            <SeccionPlanes labels={t.landing} hrefDemo={enlaceDemo(t.landing.demoAsunto)} />
          </Banda>

          <Banda id="faq">
            <SeccionFaq labels={t.landing} />
          </Banda>

          <Banda tono="sutil">
            <LandingCta labels={t.landing} />
          </Banda>
        </main>

        <LandingFooter labels={t.landing} />
      </div>
    </ShowcaseFrame>
  );
}
