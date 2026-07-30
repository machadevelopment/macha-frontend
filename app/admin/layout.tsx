import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { isStaff } from '@/lib/auth/staff-tier';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';
import { AppShell } from '@/components/shell/app-shell';

/**
 * CU-868kh8xfh: gate de ruta. Antes este layout solo daba la nav compartida y el
 * role-gating vivía únicamente en el backend, así que cualquier usuario autenticado
 * podía navegar a /admin/companies y ver el shell del panel — con su navegación y sus
 * títulos — hasta que las llamadas a /api/admin/* devolvían 403 una por una. Los datos
 * nunca estuvieron expuestos; lo que se filtraba era la ESTRUCTURA del backoffice, y
 * la experiencia era una pantalla rota en vez de una respuesta clara.
 *
 * El tier se resuelve server-side contra la tabla `staff` de Postgres (vía
 * `/me/memberships`), antes de renderizar nada.
 *
 * `notFound()` y no un mensaje de "no tienes acceso": el riesgo que el ticket describe
 * es precisamente revelar que estas secciones existen. Un 404 no lo confirma, y para
 * un cliente que llega aquí por error es además la respuesta menos confusa.
 *
 * Esto NO reemplaza la autorización: `admin.guard.ts` del backend sigue siendo la
 * autoridad y gatea cada endpoint contra la misma tabla. Aquí solo se evita renderizar
 * una pantalla inútil (criterio 3 — no se duplica la matriz de permisos).
 *
 * CU-868khvynk: el backoffice pasa a usar el MISMO `AppShell` que la app de cliente, con
 * `variant="admin"`. `components/admin/admin-nav.tsx` — una barra de links en mono, con
 * las etiquetas hardcodeadas en español — queda borrada. El design guide pide que el
 * backoffice se diferencie por la superficie inversa del orgbar y la densidad compacta,
 * no por otra identidad: dos navegaciones distintas era exactamente lo que había.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isStaff())) notFound();

  const { user } = await requireSession();
  const locale = getLocale();
  const t = getDictionary(locale);
  const activeCompanyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;

  return (
    <AppShell
      variant="admin"
      shell={t.shell}
      common={t.common}
      locale={locale}
      userEmail={user.email}
      activeCompanyId={activeCompanyId}
    >
      {/*
        Las páginas de `/admin/*` renderizan fragmentos sueltos (eyebrow + h1 + panel),
        no un `<main>` propio como las de cliente: el padding lo daba el layout viejo.
        Se conserva aquí para no tener que tocar los ocho paneles del backoffice.
      */}
      <main className="p-[var(--density-main-p)]">{children}</main>
    </AppShell>
  );
}
