import { describe, expect, test, mock } from 'bun:test';
import { ACTIVE_COMPANY_COOKIE } from '@/lib/auth/active-company';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * LA COOKIE DE EMPRESA NO PUEDE SER LA DE OTRO USUARIO
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * El fallo, en producción y en vivo durante una demo (2026-08-19): alguien se registró, su
 * empresa y su membresía se crearon perfectamente, y aun así `/onboarding` mostró "We
 * couldn't load this data" con un 500 en la consola.
 *
 * La causa no estaba en la base — se verificó contra producción que el provisioning había
 * quedado bien. Estaba en `macha-company-id`: una cookie de 30 días que guardaba el
 * `company_id` pelado, que `signOut` no borraba y que nadie contrastaba contra quien estaba
 * pidiendo. En un navegador donde antes hubo otra cuenta, seguía apuntando a la empresa
 * anterior y el BFF la mandaba como `X-Company-Id` de un usuario que no era miembro.
 *
 * Estos tests fijan las dos mitades del arreglo: que la cookie ajena NO se use, y que la
 * propia SÍ.
 */

const USUARIO = 'user-actual';
const OTRO_USUARIO = 'user-anterior';
const EMPRESA = 'empresa-del-usuario-actual';

let valorDeLaCookie: string | undefined;

mock.module('server-only', () => ({}));
mock.module('next/headers', () => ({
  cookies: () => ({
    get: (nombre: string) =>
      nombre === ACTIVE_COMPANY_COOKIE && valorDeLaCookie !== undefined
        ? { value: valorDeLaCookie }
        : undefined,
  }),
}));

const { activeCompanyId, serializeActiveCompany } =
  await import('@/lib/auth/active-company-server');

describe('activeCompanyId', () => {
  test('devuelve la empresa cuando la cookie es de este usuario', () => {
    valorDeLaCookie = serializeActiveCompany(USUARIO, EMPRESA);
    expect(activeCompanyId(USUARIO)).toBe(EMPRESA);
  });

  /**
   * EL CASO QUE CAUSÓ EL FALLO. Sin esto, el BFF manda la empresa del usuario anterior y el
   * backend responde 403 — correctamente, porque no es su empresa.
   */
  test('IGNORA la cookie que quedó de otro usuario', () => {
    valorDeLaCookie = serializeActiveCompany(OTRO_USUARIO, 'empresa-del-usuario-anterior');
    expect(activeCompanyId(USUARIO)).toBeUndefined();
  });

  /**
   * El formato viejo (solo `company_id`) es indistinguible del que causó el fallo: no se
   * puede saber de quién era. Se descarta, y el backend resuelve la empresa por membresía —
   * que es lo que hace para los 17 de 19 usuarios de producción que tienen una sola.
   */
  test('descarta el formato viejo, sin usuario', () => {
    valorDeLaCookie = 'solo-el-company-id-sin-usuario';
    expect(activeCompanyId(USUARIO)).toBeUndefined();
  });

  test('sin cookie devuelve undefined, no lanza', () => {
    valorDeLaCookie = undefined;
    expect(activeCompanyId(USUARIO)).toBeUndefined();
  });

  test('una cookie con usuario pero sin empresa no devuelve cadena vacía', () => {
    // `''` pasaría un chequeo de "hay valor" y terminaría como `X-Company-Id:` vacío.
    valorDeLaCookie = `${USUARIO}:`;
    expect(activeCompanyId(USUARIO)).toBeUndefined();
  });

  test('un prefijo parecido no cuela como el mismo usuario', () => {
    // `user-actual-2` empieza igual que `user-actual`: si la comparación fuera por prefijo
    // en vez de por el separador, esta cookie ajena pasaría.
    valorDeLaCookie = serializeActiveCompany(`${USUARIO}-2`, 'empresa-ajena');
    expect(activeCompanyId(USUARIO)).toBeUndefined();
  });
});
