import { requireSession } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { RegisterWizard } from '@/components/register-wizard';
import { InsightPoint } from '@/components/ui/insight-point';
import { MachaMark } from '@/components/ui/macha-mark';

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
export default async function RegisterPage() {
  await requireSession();
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main
      data-density="comfortable"
      className="mx-auto flex max-w-[880px] flex-col gap-5 p-[var(--density-main-p)]"
    >
      {/* max-w propio y no `max-w-app`: un formulario de alta a 1920px de ancho no se
          lee, se recorre. Esta pantalla es una columna, no un tablero. */}
      <div className="flex flex-col items-center gap-3 text-center">
        <InsightPoint size="lg">
          <MachaMark className="h-6 w-6" />
        </InsightPoint>

        <div className="flex flex-col gap-1">
          <p className="font-mono text-eyebrow uppercase text-faint">{t.register.eyebrow}</p>
          <h1 className="text-h1">{t.register.title}</h1>
          <p className="mx-auto max-w-[56ch] text-body text-muted-foreground">
            {t.register.subtitle}
          </p>
        </div>
      </div>

      <RegisterWizard labels={t.register} locale={locale} />
    </main>
  );
}
