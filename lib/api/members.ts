// Formas que devuelve macha-backend en `src/modules/members/index.ts` (CU-868kh8pwv).

export type MemberRole = 'owner' | 'admin' | 'member';
/** El rol que se puede asignar por API: `owner` no, transferir la propiedad es aparte. */
export type AssignableRole = 'admin' | 'member';

export interface Member {
  userId: string;
  email: string;
  name: string | null;
  role: MemberRole;
  status: 'active' | 'invited' | 'revoked';
  receivesReports: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: AssignableRole;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
}
