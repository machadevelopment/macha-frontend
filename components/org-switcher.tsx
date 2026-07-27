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
}: {
  initialCompanyId?: string;
  labels?: OrgSwitcherLabels;
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

  // Nothing to switch between: exactly one membership and not staff.
  if (memberships.length <= 1 && !staffTier) return null;

  const current = memberships.find((m) => m.companyId === selected);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="font-mono text-eyebrow">
              {(current?.companyName ?? 'M').slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-body">{current?.companyName ?? labels.selectCompany}</span>
          <ChevronsUpDown className="h-4 w-4 text-faint" />
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
