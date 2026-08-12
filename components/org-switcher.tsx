'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { setActiveCompany } from '@/app/actions/set-active-company';
import { request } from '@/lib/api/browser';
import { resolveActiveCompany } from '@/lib/auth/resolve-active-company';
import type { Membership } from '@/app/api/memberships/route';

/**
 * Org-switcher (CU-868kfva6c, design guide.md §"orgbar"). Fetches memberships
 * client-side via the /api/memberships BFF route (the component itself never
 * sees an access token). Single-membership accounts auto-select without
 * showing a dropdown — mirrors the fallback tenant.derive.ts already applies
 * server-side when only one membership exists.
 *
 * `initialCompanyId` is read server-side (Server Component) from the
 * `macha-company-id` cookie so the trigger label doesn't flash "Selecciona..."
 * before the client fetch resolves.
 *
 * CU-868khvynk: vive en el `orgbar` del sidebar, no en el body de `/`. Dos cambios
 * que trae ese traslado:
 *   - `collapsed`: en el riel de 56px solo cabe el avatar.
 *   - cuando no hay nada entre qué cambiar (una sola membresía y sin staff) ya no
 *     devuelve `null`, sino una fila estática con la empresa. En `/` un hueco vacío
 *     pasaba desapercibido; en el orgbar del shell dejaba un borde flotando sin
 *     contenido y al usuario sin saber en qué empresa está.
 */
export interface OrgSwitcherLabels {
  selectCompany: string;
  machaInternal: string;
}

/**
 * CU-868kkgbtv: `labels` es OBLIGATORIO y ya no tiene default.
 *
 * Antes había un `defaultLabels` con los textos quemados en español. Hoy
 * `app-shell` siempre pasa `labels`, así que era inalcanzable — pero era un
 * default en el idioma equivocado esperando a que alguien montara el componente
 * sin props, y el fallo habría sido silencioso (texto en español a un cliente en
 * inglés, no un error). Volviéndolo requerido, ese caso deja de compilar en vez
 * de degradarse en silencio.
 */
export function OrgSwitcher({
  initialCompanyId,
  labels,
  collapsed = false,
}: {
  initialCompanyId?: string;
  labels: OrgSwitcherLabels;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [staffTier, setStaffTier] = useState<string | null>(null);
  const [selected, setSelected] = useState(initialCompanyId);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    // CU-868kkgb3c: antes era `.then(r => r.json())` sin manejo de fallo. Un backend
    // caído dejaba `memberships` en `null` y, con el `return null` de abajo, el orgbar
    // desaparecía del sidebar entero.
    void request<{ memberships: Membership[]; staffTier: string | null }>('/api/memberships').then(
      (result) => {
        if (cancelled || !result.ok) return;
        const { memberships: list, staffTier: tier } = result.data;
        setMemberships(list);
        setStaffTier(tier);

        /**
         * CU-868kkgbgq: se reconcilia la cookie con las membresías REALES.
         *
         * Antes solo se auto-seleccionaba cuando no había cookie. Si la cookie apuntaba a
         * una empresa de la que el usuario ya no es miembro (lo sacaron, se desactivó la
         * empresa, o la cookie sobrevivió a un cambio de cuenta), `selected` se quedaba con
         * ese id mientras la etiqueta caía a `memberships[0].companyName`: el sidebar decía
         * una empresa y cada request mandaba el `X-Company-Id` de otra.
         *
         * No hay fuga —`tenant.derive.ts` valida el header contra las membresías reales y
         * rechaza el que no corresponda—, pero la pantalla afirmaba algo falso.
         *
         * La regla vive en `resolveActiveCompany` y no aquí (criterio 4): inline dentro
         * del efecto solo se podía fijar montando el componente, y el frontend no tiene
         * librería de testing de componentes (CU-868kjbxwa).
         */
        const { selected: target, needsWrite } = resolveActiveCompany(initialCompanyId, list);
        setSelected(target);
        if (needsWrite && target) {
          startTransition(() => {
            void setActiveCompany(target).then(() => router.refresh());
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!memberships) return null;

  function selectCompany(companyId: string) {
    setSelected(companyId);
    startTransition(() => {
      void setActiveCompany(companyId).then(() => router.refresh());
    });
  }

  // CU-868kkgbgq: sin el `?? memberships[0]?.companyName` de antes. Ese fallback era
  // justamente lo que hacía que la etiqueta mostrara una empresa distinta de la que
  // viaja en la cookie. Si no se puede resolver, se dice que no hay empresa elegida —
  // nunca el nombre de otra.
  const current = memberships.find((m) => m.companyId === selected);
  const name = current?.companyName ?? labels.selectCompany;
  const initial = name.slice(0, 1).toUpperCase();

  // Nothing to switch between: exactly one membership and not staff.
  if (memberships.length <= 1 && !staffTier) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5" title={name}>
        <Avatar className="h-5 w-5 shrink-0 rounded-sm">
          <AvatarFallback className="font-mono text-eyebrow">{initial}</AvatarFallback>
        </Avatar>
        {!collapsed && <span className="truncate text-body">{name}</span>}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex w-full items-center gap-2 px-2 py-1.5" title={name}>
          <Avatar className="h-5 w-5 shrink-0 rounded-sm">
            <AvatarFallback className="font-mono text-eyebrow">{initial}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left text-body">{name}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {memberships.map((m) => (
          <DropdownMenuItem key={m.companyId} onSelect={() => selectCompany(m.companyId)}>
            <span className="font-mono text-eyebrow uppercase text-faint">{m.role}</span>
            <span>{m.companyName}</span>
          </DropdownMenuItem>
        ))}
        {staffTier && (
          <DropdownMenuItem onSelect={() => router.push('/admin')} className="text-faint">
            <Building2 className="h-4 w-4" />
            {labels.machaInternal}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
