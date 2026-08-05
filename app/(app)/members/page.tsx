import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { MembersPanel } from '@/components/members/members-panel';

// CU-868kh8pwv: equipo de la empresa. La capacidad (`manage_members`) la impone el
// backend; esta pantalla la refleja. middleware.ts ya exige sesión.
export default function MembersPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="comfortable" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.members.eyebrow}</p>
      <h1 className="mb-1 text-h1">{t.members.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.members.subtitle}</p>

      <MembersPanel labels={t.members} common={t.common} />
    </main>
  );
}
