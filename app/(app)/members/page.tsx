import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
      <PageHeader icon={Users} title={t.members.title} subtitle={t.members.subtitle} />

      <MembersPanel labels={t.members} common={t.common} />
    </main>
  );
}
