import { requireSession } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { RegisterWizard } from '@/components/register-wizard';
import { ShowcaseFrame, ShowcaseHeading } from '@/components/ui/showcase';

// CU-868kfvae1: wizard de registro autoservicio. middleware.ts ya exige sesión
// (no está en unauthenticatedPaths) — el usuario ya pasó por la hosted UI de
// AuthKit pero todavía no tiene ninguna empresa/membresía, que es justamente lo
// que este flujo crea. Densidad "comfortable" (onboarding), no "compact".
//
// TICKET B4 — ESTA ES PANTALLA DE VITRINA (design guide §2.7), y es de las tres o cuatro
// del producto donde la marca va al 100%: el isotipo, el Insight Point y el salvia. Acá
// el verde de MARCA es el correcto porque no hay ni un dato en pantalla — es la
// presentación del producto a alguien que todavía no es cliente. En cuanto entra al
// dashboard, el salvia desaparece y el color pasa a ser funcional.
//
// CU-868knx0vh — SEGUNDA PASADA. B4 dejó el sello y el ancho de 880px, y le faltaban las
// dos cosas que hacen que una vitrina se lea como tal:
//
//   · el FONDO AMBIENTAL. El Insight Point estaba solo como figura, sobre lienzo liso; la
//     variante `ambient` es la que da atmósfera, y va acá y no en el dashboard porque en
//     esta pantalla no hay ni una cifra que el salvia pueda contaminar.
//   · la JERARQUÍA TIPOGRÁFICA. El titular iba en `h1` (27px), el tamaño calibrado para
//     competir con KPIs y tablas. En una columna centrada sin datos se leía tímido: ahora
//     usa `display` desde `sm`.
//
// El marco y la cabecera salen de `components/ui/showcase.tsx` y no se escriben acá: los
// comparte con `/`, la invitación, el 404 y la pantalla de error, y el fondo ambiental
// depende de que el contenedor lo recorte — repetirlo a mano es la forma de que un día se
// escape por detrás del contenido.
export default async function RegisterPage() {
  await requireSession();
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <ShowcaseFrame className="min-h-dvh">
      {/* max-w propio y no `max-w-app`: un formulario de alta a 1920px de ancho no se
          lee, se recorre. Esta pantalla es una columna, no un tablero. */}
      <main
        data-density="comfortable"
        className="mx-auto flex max-w-[880px] flex-col gap-7 p-[var(--density-main-p)] py-12"
      >
        <ShowcaseHeading
          eyebrow={t.register.eyebrow}
          title={t.register.title}
          subtitle={t.register.subtitle}
        />

        <RegisterWizard labels={t.register} locale={locale} />
      </main>
    </ShowcaseFrame>
  );
}
