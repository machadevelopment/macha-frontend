import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';

/**
 * Thin wrapper for /admin/* BFF routes — no X-Company-Id (the backend's admin
 * namespace is gated by staff/super_admin via the `staff` table, not company_users;
 * see macha-backend src/guards/admin.guard.ts). A non-staff user gets a 403 from the
 * backend itself — this wrapper doesn't duplicate that check client-side.
 */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { accessToken } = await requireSession();
  return apiFetch<T>(path, { ...init, accessToken });
}
