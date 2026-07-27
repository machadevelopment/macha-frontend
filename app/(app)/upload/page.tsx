import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { UploadScreen } from '@/components/upload/upload-screen';

// CU-868kfva7z: pantalla de ingesta. middleware.ts ya exige sesión para todo lo que
// no sea '/'/'/callback' — no hay chequeo de auth adicional aquí.
export default function UploadPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.upload.eyebrow}</p>
      <h1 className="text-h1">{t.upload.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.upload.subtitle}</p>
      <UploadScreen locale={locale} labels={t.upload} />
    </main>
  );
}
