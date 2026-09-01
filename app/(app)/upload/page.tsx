import { UploadCloud } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { UploadScreen } from '@/components/upload/upload-screen';
import { getActiveRole } from '@/lib/auth/active-role';

// CU-868kfva7z: pantalla de ingesta. middleware.ts ya exige sesión para todo lo que
// no sea '/'/'/callback' — no hay chequeo de auth adicional aquí.
/**
 * `?doc=<id>` — a dónde apunta el correo de "tu archivo necesita tu atención" y el banner del
 * Dashboard (CU-868kyur58).
 *
 * Se lee en el SERVIDOR y baja como prop en vez de que el componente cliente mire
 * `useSearchParams`: así el resalte y el panel abierto están en la PRIMERA pintura, sin el
 * parpadeo de "lista normal → salta a la fila" que vería quien llega desde el correo.
 *
 * Un `doc` que no corresponde a nada (ya se resolvió, o es de otra empresa) no produce error:
 * la lista simplemente no encuentra a quién resaltar. Es lo que pide el ticket y es lo correcto
 * — un enlace de un correo de hace tres días no puede terminar en una pantalla de error.
 */
export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string | string[] }>;
}) {
  const { doc } = await searchParams;
  // `?doc=a&doc=b` llega como arreglo: se toma el primero en vez de romper. Nadie lo escribe a
  // mano, pero un cliente de correo que reescribe enlaces sí puede duplicar un parámetro.
  const destacado = Array.isArray(doc) ? doc[0] : doc;

  const locale = getLocale();
  const t = getDictionary(locale);

  // CU-868kh8nhy: `revert_upload` es owner/admin (Matriz 1, CU-868kfv96c). Se resuelve
  // aquí solo para no mostrarle a un `member` un botón que el backend rechazaría con
  // 403 — la autorización real sigue siendo del backend, no de esta línea.
  const role = await getActiveRole();
  const canRevert = role === 'owner' || role === 'admin';

  return (
    <main data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <PageHeader icon={UploadCloud} title={t.upload.title} subtitle={t.upload.subtitle} />
      <UploadScreen
        locale={locale}
        labels={t.upload}
        common={t.common}
        canRevert={canRevert}
        destacado={destacado}
      />
    </main>
  );
}
