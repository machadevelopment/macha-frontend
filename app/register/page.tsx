import { requireSession } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { RegisterWizard } from '@/components/register-wizard';

// CU-868kfvae1: wizard de registro autoservicio. middleware.ts ya exige sesión
// (no está en unauthenticatedPaths) — el usuario ya pasó por la hosted UI de
// AuthKit pero todavía no tiene ninguna empresa/membresía, que es justamente lo
// que este flujo crea. Densidad "comfortable" (onboarding), no "compact".
export default async function RegisterPage() {
  await requireSession();
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="comfortable" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.register.eyebrow}</p>
      <h1 className="mb-1 text-h1">{t.register.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.register.subtitle}</p>

      <RegisterWizard labels={t.register} />
    </main>
  );
}
