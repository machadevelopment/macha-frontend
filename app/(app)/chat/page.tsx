import { Suspense } from 'react';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ChatClient } from '@/components/chat/chat-client';

// CU-868kfvac2: interfaz de chat CFO. middleware.ts ya exige sesión.
export default function ChatPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.chat.eyebrow}</p>
      <h1 className="mb-4 text-h1">{t.chat.title}</h1>
      {/* ChatClient reads ?thread= via useSearchParams() (deep-link from reports,
          CU-868kfvacr) — Next.js requires a Suspense boundary around that. */}
      <Suspense fallback={null}>
        <ChatClient locale={locale} labels={t.chat} common={t.common} />
      </Suspense>
    </main>
  );
}
