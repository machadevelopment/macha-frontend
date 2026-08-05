import { describe, expect, test } from 'bun:test';
import { resolveActiveCompany } from './resolve-active-company';
import type { Membership } from '@/app/api/memberships/route';

const m = (companyId: string, companyName: string): Membership =>
  ({ companyId, companyName, role: 'owner' }) as Membership;

const A = m('company-a', 'Empresa A');
const B = m('company-b', 'Empresa B');

/**
 * CU-868kkgbgq criterio 4. El caso que da nombre al ticket es el tercero: cookie con un
 * id ajeno a las membresías. Antes, `selected` se quedaba con ese id mientras la etiqueta
 * caía a `memberships[0].companyName` — el sidebar decía una empresa y cada request
 * mandaba el `X-Company-Id` de otra.
 */
describe('reconciliación de la empresa activa', () => {
  test('cookie válida: no se toca nada', () => {
    expect(resolveActiveCompany('company-a', [A, B])).toEqual({
      selected: 'company-a',
      needsWrite: false,
    });
  });

  test('sin cookie: auto-selecciona la primera y la escribe', () => {
    expect(resolveActiveCompany(undefined, [A, B])).toEqual({
      selected: 'company-a',
      needsWrite: true,
    });
  });

  test('cookie de una empresa AJENA: reconcilia a una válida y reescribe', () => {
    expect(resolveActiveCompany('company-zombie', [A, B])).toEqual({
      selected: 'company-a',
      needsWrite: true,
    });
  });

  test('cero membresías con cookie vieja: ninguna seleccionada, nada que escribir', () => {
    expect(resolveActiveCompany('company-zombie', [])).toEqual({
      selected: undefined,
      needsWrite: false,
    });
  });

  test('cero membresías y sin cookie', () => {
    expect(resolveActiveCompany(undefined, [])).toEqual({
      selected: undefined,
      needsWrite: false,
    });
  });

  /**
   * La invariante que resume el bug: lo que queda seleccionado siempre está entre las
   * membresías reales, o no hay nada seleccionado. Nunca un id que la UI no pueda
   * resolver a un nombre — que era exactamente la contradicción entre etiqueta y cookie.
   */
  test('lo seleccionado siempre es resoluble contra las membresías', () => {
    const casos: Array<[string | undefined, Membership[]]> = [
      ['company-a', [A, B]],
      ['company-zombie', [A, B]],
      [undefined, [B]],
      ['company-zombie', []],
      [undefined, []],
    ];
    for (const [cookie, lista] of casos) {
      const { selected } = resolveActiveCompany(cookie, lista);
      if (selected !== undefined) {
        expect(lista.some((x) => x.companyId === selected)).toBe(true);
      }
    }
  });
});
