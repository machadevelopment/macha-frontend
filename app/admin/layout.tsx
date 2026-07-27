import { AdminNav } from '@/components/admin/admin-nav';

// role-gating real vive en el backend (staff/super_admin, guards/admin.guard.ts) —
// este layout solo da la nav compartida; un usuario no-staff recibe 403 de cada
// llamada a /api/admin/* y las páginas lo muestran como error, no lo previenen aquí.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="compact" className="mx-auto max-w-app p-[var(--density-main-p)]">
      <AdminNav />
      {children}
    </div>
  );
}
