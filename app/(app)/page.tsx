import { cookies } from 'next/headers';
import { getSignInUrl, signOut } from '@workos-inc/authkit-nextjs';
import { getOptionalSession } from '@/lib/auth/session';
import { OrgSwitcher } from '@/components/org-switcher';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ACTIVE_COMPANY_COOKIE } from '@/app/actions/set-active-company';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';

// Customer app entry (placeholder). Real dashboard lands in F2+.
// `/` is the one unauthenticated path (middleware.ts) — it's both the landing
// page and the hosted-login entry point (CU-868kfva59). No custom form: 100%
// hosted UI, per CLAUDE.md ("app verifies session, it does not implement
// login/password/email-verification").
// The org-switcher is mounted here as a placeholder host — the real sidebar
// shell (design guide.md "orgbar") is Design System epic scope, deferred.
// Density: dashboards/tables use data-density="compact".
export default async function Home() {
  const { user } = await getOptionalSession();
  const activeCompanyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <div className="flex items-center justify-between">
        <p className="font-mono text-eyebrow uppercase text-faint">{t.home.eyebrow}</p>
        <LocaleSwitcher locale={locale} />
      </div>
      <h1 className="text-h1">{t.home.title}</h1>
      <p className="text-body text-muted-foreground">{t.home.subtitle}</p>

      {user && <OrgSwitcher initialCompanyId={activeCompanyId} labels={t.common} />}
      {user && (
        <a href="/upload" className="text-body underline">
          {t.upload.title}
        </a>
      )}
      {user && (
        <a href="/dashboard" className="text-body underline">
          {t.dashboard.title}
        </a>
      )}
      {user && (
        <a href="/chat" className="text-body underline">
          {t.chat.title}
        </a>
      )}

      {user ? (
        <form
          action={async () => {
            'use server';
            await signOut({ returnTo: '/' });
          }}
        >
          <p className="font-mono text-body">{user.email}</p>
          <button type="submit" className="text-body underline">
            {t.common.signOut}
          </button>
        </form>
      ) : (
        <a href={await getSignInUrl()} className="text-body underline">
          {t.common.signIn}
        </a>
      )}
    </main>
  );
}
