import 'server-only';
import { cookies } from 'next/headers';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * LA EMPRESA ACTIVA, PERO SOLO SI ES DE QUIEN ESTÁ PIDIENDO
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * ═══ EL FALLO QUE ESTO ARREGLA (producción, 2026-08-19) ═══
 *
 * Un usuario que acababa de registrarse veía "We couldn't load this data" en `/onboarding`
 * y un 500 en la consola, con su empresa recién creada y su membresía perfectamente
 * guardadas en la base. Verificado contra producción: `jose+test19ago@u3tech.co` tenía su
 * empresa (SNAYDERK) y su membresía `owner`/`active`. Nada de eso estaba mal.
 *
 * Lo que estaba mal era la COOKIE. `macha-company-id` guardaba un `company_id` pelado y:
 *
 *   · `signOutAction` destruye la sesión de WorkOS pero NUNCA la borra;
 *   · dura 30 días con `path: '/'`;
 *   · nadie la contrastaba contra las membresías de quien está pidiendo.
 *
 * O sea que sobrevivía al cambio de usuario. En un navegador donde antes hubo otra cuenta
 * —el de una demo, el de alguien que prueba dos cuentas, cualquier equipo compartido— la
 * cookie seguía apuntando a la empresa del usuario ANTERIOR, el BFF la mandaba como
 * `X-Company-Id`, y `tenant.derive.ts` respondía, correctamente, 403 "Not a member of the
 * requested company". El backend hacía exactamente su trabajo; el frontend le estaba
 * pidiendo datos de una empresa ajena.
 *
 * ═══ POR QUÉ LA COOKIE LLEVA AHORA EL USUARIO ADENTRO ═══
 *
 * Borrarla al cerrar sesión (que también se hace ahora, ver `sign-out.ts`) NO alcanza: el
 * caso real no fue un logout, fue registrar una cuenta nueva encima de una sesión previa.
 * Atarla al usuario cubre todos los caminos de una vez —logout, registro, sesión expirada,
 * dos cuentas en el mismo navegador— y sin una sola consulta extra: el `userId` ya viene
 * de la sesión verificada.
 *
 * ═══ EL FORMATO VIEJO SE DESCARTA, NO SE ACEPTA ═══
 *
 * Una cookie sin `userId` es indistinguible de la que causó este fallo, así que aceptarla
 * "por compatibilidad" sería conservar el bug con otro nombre.
 *
 * Descartarla no rompe a nadie: sin `X-Company-Id`, `tenant.derive.ts` resuelve la empresa
 * sola cuando el usuario tiene UNA (17 de los 19 usuarios de producción, medido). A los dos
 * que tienen varias —`kenethruiz2002@gmail.com` y el `e2e-probe`— les toca volver a elegir
 * en el selector una vez, y esa acción reescribe la cookie con el formato nuevo.
 *
 * NO es una garantía de autorización, igual que antes: sigue siendo una preferencia de UI.
 * La autoridad es `tenant.derive.ts` en el backend, que valida el `X-Company-Id` contra las
 * membresías reales en cada request (CLAUDE.md — `company_id` nunca se confía del cliente).
 * Lo que cambia es que ahora el frontend deja de mandar, sin saberlo, un valor que el
 * backend va a rechazar.
 */

/** Separador entre usuario y empresa. Un `:` no aparece en un UUID, así que no hay ambigüedad. */
const SEP = ':';

/** Arma el valor de la cookie. Un solo sitio construye el formato y un solo sitio lo lee. */
export function serializeActiveCompany(userId: string, companyId: string): string {
  return `${userId}${SEP}${companyId}`;
}

/**
 * La empresa activa de ESTE usuario, o `undefined` si la cookie no es suya (o no existe, o
 * viene en el formato viejo sin usuario).
 *
 * `undefined` es una respuesta legítima y segura: el BFF omite el header y el backend
 * resuelve la empresa por membresía. Lo que nunca debe pasar es devolver el `company_id` de
 * otra persona, que es justo lo que hacía antes.
 */
export function activeCompanyId(userId: string): string | undefined {
  const raw = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  if (!raw) return undefined;

  const sep = raw.indexOf(SEP);
  // Formato viejo (solo `company_id`): no se puede saber de quién es. Se descarta.
  if (sep === -1) return undefined;

  if (raw.slice(0, sep) !== userId) return undefined;

  return raw.slice(sep + 1) || undefined;
}
