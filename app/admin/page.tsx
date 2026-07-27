import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';

// Admin panel lives in the frontend (not a third app); role-gated via backend staff tier.
// Uses the inverse (dark) orgbar surface to signal backoffice context.
export default function AdminHome() {
  const t = getDictionary(getLocale());
  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.admin.eyebrow}</p>
      <h1 className="text-h1">{t.admin.title}</h1>
    </main>
  );
}
