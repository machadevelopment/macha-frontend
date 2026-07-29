import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { UploadScreen } from '@/components/upload/upload-screen';
import { getActiveRole } from '@/lib/auth/active-role';

// CU-868kfva7z: pantalla de ingesta. middleware.ts ya exige sesión para todo lo que
// no sea '/'/'/callback' — no hay chequeo de auth adicional aquí.
export default async function UploadPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  // CU-868kh8nhy: `revert_upload` es owner/admin (Matriz 1, CU-868kfv96c). Se resuelve
  // aquí solo para no mostrarle a un `member` un botón que el backend rechazaría con
  // 403 — la autorización real sigue siendo del backend, no de esta línea.
  const role = await getActiveRole();
  const canRevert = role === 'owner' || role === 'admin';

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <p className="font-mono text-eyebrow uppercase text-faint">{t.upload.eyebrow}</p>
      <h1 className="text-h1">{t.upload.title}</h1>
      <p className="mb-4 text-body text-muted-foreground">{t.upload.subtitle}</p>
      <UploadScreen locale={locale} labels={t.upload} canRevert={canRevert} />
    </main>
  );
}
