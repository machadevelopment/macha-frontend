import { notFound } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';
import { isStaff } from '@/lib/auth/staff-tier';

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
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isStaff())) notFound();

  return (
    <div data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <AdminNav />
      {children}
    </div>
  );
}
