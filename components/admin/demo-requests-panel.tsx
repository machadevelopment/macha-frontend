'use client';

import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { Button } from '@/components/ui/button';
import { request } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';
import { formatDate } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';

interface DemoRequest {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string | null;
  message: string | null;
  locale: string;
  source: string;
  createdAt: string;
}

const PAGE_SIZE = 50;

/**
 * Lista de leads de la landing. Solo lectura: no hay estado "contactado" en la tabla
 * (append-only, migración 0036). El staff escribe por fuera; acá solo ve quién escribió.
 */
export function DemoRequestsPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['demoRequests'];
  common: Dictionary['admin']['common'];
}) {
  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<DemoRequest>(
    useCallback(async (offset) => {
      const result = await request<{ requests: DemoRequest[]; hasMore: boolean }>(
        `/api/admin/demo-requests?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      if (!result.ok) return result;
      return {
        ok: true as const,
        data: {
          items: result.data.requests,
          hasMore: result.data.hasMore,
        },
      };
    }, []),
  );

  if (state.status === 'error') {
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  }
  if (state.status === 'loading') {
    return <p className="text-body text-muted-foreground">{common.loading}</p>;
  }

  const rows = state.items;
  if (rows.length === 0) {
    return <p className="text-body text-muted-foreground">{labels.empty}</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-body font-semibold text-foreground">
              {r.name} · {r.companyName}
            </p>
            <p className="font-mono text-micro text-faint">
              {formatDate(r.createdAt)} · {r.locale.toUpperCase()}
            </p>
          </div>
          <p className="text-body text-muted-foreground">
            <a href={`mailto:${r.email}`} className="underline underline-offset-2">
              {r.email}
            </a>
            {r.phone ? ` · ${r.phone}` : ''}
          </p>
          {r.message && (
            <p className="whitespace-pre-wrap text-body text-foreground">{r.message}</p>
          )}
        </Card>
      ))}
      {moreError && (
        <AdminLoadError
          error={moreError}
          labels={common.loadError}
          onRetry={() => void loadMore()}
        />
      )}
      {state.hasMore && (
        <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? common.loading : common.loadMore}
        </Button>
      )}
    </div>
  );
}
