import type { Membership } from '@/app/api/memberships/route';

/**
 * CU-868kkgbgq criterio 4: la reconciliación de la cookie `macha-company-id` contra las
 * membresías reales, como función pura para poder probarla.
 *
 * Vivía inline dentro del `useEffect` del org-switcher, así que la única forma de fijarla
 * era montar el componente — y el frontend no tiene librería de testing de componentes
 * (eso es CU-868kjbxwa). Sacarla aquí cubre el criterio sin arrastrar una dependencia
 * nueva, y de paso deja la regla en un sitio donde se lee sin ruido de React.
 *
 * El bug que evita: si la cookie apunta a una empresa de la que el usuario ya no es
 * miembro, la etiqueta caía a `memberships[0].companyName` pero `selected` y la cookie
 * seguían con el id viejo. El sidebar decía una empresa y cada request mandaba el
 * `X-Company-Id` de otra. No hay fuga —`tenant.derive.ts` valida el header contra las
 * membresías reales—, pero la pantalla afirmaba algo falso.
 *
 * La cookie es preferencia de UI, nunca autorización. Eso no cambia.
 */
export interface ResolucionEmpresaActiva {
  /** Empresa que debe quedar seleccionada. `undefined` = ninguna resoluble. */
  selected: string | undefined;
  /** Si hay que reescribir la cookie y refrescar. Solo cuando cambia de verdad. */
  needsWrite: boolean;
}

export function resolveActiveCompany(
  cookieCompanyId: string | undefined,
  memberships: Membership[],
): ResolucionEmpresaActiva {
  const sigueSiendoMiembro =
    cookieCompanyId !== undefined && memberships.some((m) => m.companyId === cookieCompanyId);

  // La cookie es válida: no se toca nada. Reescribirla en cada carga dispararía un
  // `router.refresh()` por render.
  if (sigueSiendoMiembro) return { selected: cookieCompanyId, needsWrite: false };

  // Hay a qué reconciliar: primera membresía. Cubre las dos entradas — cookie ausente
  // (auto-select, que ya existía) y cookie apuntando a una empresa ajena (el bug).
  const primera = memberships[0]?.companyId;
  if (primera) return { selected: primera, needsWrite: true };

  // Cero membresías con cookie vieja. No hay a qué reconciliar: se limpia la selección
  // para que la etiqueta diga "selecciona una empresa" en vez del nombre de otra.
  return { selected: undefined, needsWrite: false };
}
