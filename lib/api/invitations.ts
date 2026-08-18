/**
 * Forma de `GET /invitations/pending` en macha-backend (`src/modules/members/index.ts`).
 *
 * CU-868ktkq8r. Es la lista de invitaciones vivas dirigidas al CORREO de la sesión, no
 * al enlace del correo. Existe porque el token del enlace no puede ser la única llave:
 * el invitado nuevo pasa por la hosted UI de WorkOS —crear cuenta, verificar correo, a
 * veces en otra pestaña— y cualquier tropiezo ahí lo deja dentro del producto sin el
 * `?token=`, sin ninguna pantalla que lo lleve a la empresa que lo invitó y con el alta
 * como único camino visible.
 *
 * No es una llave nueva: la política de RLS de la migración 0017 ya concede a propósito
 * la visibilidad "por destinatario", y el chequeo que autoriza aceptar sigue siendo el
 * mismo de siempre (que el correo de la invitación empate con el de la cuenta).
 */
export interface PendingInvitation {
  id: string;
  companyId: string;
  companyName: string;
  role: 'admin' | 'member';
  expiresAt: string;
}

/**
 * Motivo por el que el backend rechaza una aceptación (`lib/invitations.ts` allá).
 *
 * Viaja junto al texto en español que el backend ya devolvía, y no en su lugar: el texto
 * sigue siendo la red para un motivo que este cliente todavía no conozca. Pero el motivo
 * es lo que permite decirlo en el idioma del usuario, y esta pantalla es justamente donde
 * eso importa más — un invitado angloparlante la ve ANTES que cualquier otra del producto.
 *
 * `not_found` y `not_pending` se traducen al MISMO texto a propósito: distinguirlos le
 * diría a quien prueba tokens cuáles existen.
 */
export type InvitationRejectionReason = 'not_found' | 'not_pending' | 'expired' | 'wrong_recipient';

export function invitationRejectionKey(
  reason: unknown,
): 'invalid' | 'expired' | 'wrongRecipient' | null {
  switch (reason) {
    case 'not_found':
    case 'not_pending':
      return 'invalid';
    case 'expired':
      return 'expired';
    case 'wrong_recipient':
      return 'wrongRecipient';
    default:
      return null;
  }
}
