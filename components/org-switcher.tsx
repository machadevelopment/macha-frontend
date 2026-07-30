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

const defaultLabels: OrgSwitcherLabels = {
  selectCompany: 'Selecciona una empresa',
  machaInternal: 'Macha Internal',
};

export function OrgSwitcher({
  initialCompanyId,
  labels = defaultLabels,
  collapsed = false,
}: {
  initialCompanyId?: string;
  labels?: OrgSwitcherLabels;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [staffTier, setStaffTier] = useState<string | null>(null);
  const [selected, setSelected] = useState(initialCompanyId);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/memberships')
      .then((r) => r.json())
      .then((data: { memberships: Membership[]; staffTier: string | null }) => {
        if (cancelled) return;
        setMemberships(data.memberships);
        setStaffTier(data.staffTier);
        if (!initialCompanyId && data.memberships.length === 1) {
          const onlyCompanyId = data.memberships[0].companyId;
          setSelected(onlyCompanyId);
          startTransition(() => {
            void setActiveCompany(onlyCompanyId).then(() => router.refresh());
          });
        }
      });
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

  const current = memberships.find((m) => m.companyId === selected);
  const name = current?.companyName ?? memberships[0]?.companyName ?? labels.selectCompany;
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
