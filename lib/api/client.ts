import 'server-only';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Wrapper de fetch hacia macha-backend. `companyId` es únicamente la preferencia
 * de UI (cookie `macha-company-id`, Parte C del org-switcher) — el backend es la
 * única autoridad: `tenant.derive.ts` rechaza cualquier X-Company-Id que no sea
 * una membresía real del usuario autenticado (ver CLAUDE.md: company_id nunca se
 * confía desde el cliente).
 */
export async function apiFetch<T>(
  path: string,
  { accessToken, companyId, ...init }: RequestInit & { accessToken: string; companyId?: string },
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (companyId) headers.set('X-Company-Id', companyId);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Same auth wiring as apiFetch, but returns the raw Response — for binary passthrough (file downloads) where callers must not force a JSON parse. */
export async function apiFetchRaw(
  path: string,
  { accessToken, companyId, ...init }: RequestInit & { accessToken: string; companyId?: string },
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (companyId) headers.set('X-Company-Id', companyId);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} -> ${res.status}`);
  }
  return res;
}
