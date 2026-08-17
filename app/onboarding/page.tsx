import { requireSession } from '@/lib/auth/session';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { FileSetup } from '@/components/onboarding/file-setup';
import { ShowcaseFrame, ShowcaseHeading } from '@/components/ui/showcase';

/**
 * Paso de configuración de archivos, justo después del alta (CU-868krmrcj, fase C).
 *
 * ═══ POR QUÉ VIVE FUERA DE `(app)` ═══
 *
 * Es pantalla de VITRINA (design guide §2.7), como el registro y la aceptación de
 * invitación: la persona acaba de crear su empresa y todavía no ha visto un solo dato suyo.
 * Montada dentro de `(app)` heredaría el sidebar con Dashboard, Analítica e Inventario —
 * todos vacíos— y el primer contacto con el producto sería una fila de pantallas en cero.
 * Acá la marca va al 100 % justamente porque no hay ninguna cifra que el salvia pueda
 * contaminar; en cuanto entre al panel, el color vuelve a ser funcional.
 *
 * `middleware.ts` ya exige sesión (esta ruta no está en `unauthenticatedPaths`), que es lo
 * correcto: se llega acá con sesión y con empresa recién creada.
 *
 * ═══ CÓMO SE LLEGA ═══
 *
 * Por los DOS caminos del alta, y hubo que tocar los dos porque se bifurcan según el plan:
 *
 *   · Sin cobro → `register-wizard.tsx` redirige acá en vez de a `/dashboard`.
 *   · Con cobro → el `successUrl` del checkout, que lo arma el BACKEND
 *     (`modules/billing/register.ts`). Sin ese cambio, justo los clientes que pagan se
 *     saltaban el onboarding — que es exactamente al revés de lo que uno querría.
 *
 * Densidad `comfortable` y no `compact`: es onboarding, no un tablero.
 */
export default async function OnboardingPage() {
  await requireSession();
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <ShowcaseFrame className="min-h-dvh">
      {/* Mismo ancho de columna que el registro: es la continuación de ese flujo y saltar
          de 880px a un tablero ancho se siente como haber cambiado de producto. */}
      <main
        data-density="comfortable"
        className="mx-auto flex max-w-[880px] flex-col gap-7 p-[var(--density-main-p)] py-12"
      >
        <ShowcaseHeading
          eyebrow={t.onboarding.eyebrow}
          title={t.onboarding.title}
          subtitle={t.onboarding.subtitle}
        />

        <FileSetup labels={t.onboarding} uploadLabels={t.upload} common={t.common} />
      </main>
    </ShowcaseFrame>
  );
}
