import { ShowcaseFrame } from '@/components/ui/showcase';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingCta } from '@/components/landing/landing-cta';
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
 * El diseño sale del Figma `4aOl3snsDmFRsRQdOGM8z2`, leído por la API (frame `4:218`). Los 16
 * frames de ese archivo NO son variantes a elegir: son 16 importaciones del mismo HTML con ruido
 * entre iteraciones — comparados por contenido, las diferencias son de una a veinticuatro líneas
 * sobre 244, del tipo "Obtener insights" contra "Obtener Insights".
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
 * ═══ QUÉ ESTÁ Y QUÉ FALTA, DICHO CLARO ═══
 *
 * Construidas: nav, hero con el mockup, CTA de cierre y footer. Es la primera pantalla completa
 * más el remate, o sea una landing publicable de punta a punta.
 *
 * Pendientes las 9 secciones intermedias del diseño: "por qué existe Macha", fragmentado contra
 * centralizado, "cómo funciona", el producto, las cinco capacidades, el asesor con IA,
 * automatización, antes/después, seguridad, planes y FAQ. El copy de TODAS ya está extraído del
 * Figma; lo que falta es el layout de cada una, y varias necesitan estado de cliente (el
 * acordeón numerado, el FAQ). Se agregan como componentes hermanos en `components/landing/` sin
 * tocar nada de lo de acá.
 *
 * Por eso el nav recibe `anclas={[]}`: los enlaces a secciones que todavía no existen no se
 * pintan. Un nav con enlaces que no llevan a ninguna parte es peor que un nav corto.
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
        <LandingNav locale={locale} labels={t.landing} common={t.common} anclas={[]} />

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

        <div className="mt-16 flex flex-col gap-28 app:mt-24">
          <LandingHero labels={t.landing} />
          <LandingCta labels={t.landing} />
        </div>

        <LandingFooter labels={t.landing} />
      </div>
    </ShowcaseFrame>
  );
}
