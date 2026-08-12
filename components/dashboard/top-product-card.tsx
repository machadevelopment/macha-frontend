'use client';

import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import type { DateRange } from '@/lib/period';
import type { ProductRevenueResponse } from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * "Top Product" del prototipo: el producto que más facturó en el período, con los
 * siguientes debajo.
 *
 * Recibe los datos ya cargados en vez de pedirlos: el rango lo manda el filtro de
 * período y esta tarjeta tiene que moverse con él. Si hiciera su propio fetch con su
 * propio rango, las píldoras dirían "hoy" y el ranking seguiría mostrando el mes.
 *
 * El estado vacío distingue dos cosas que se ven igual y no lo son: que no haya ventas
 * en el período, y que las ventas existan pero sin producto identificado. Lo segundo es
 * lo normal en documentos ingeridos antes de que la IA extrajera el campo, y decir "no
 * hay ventas" ahí sería falso.
 */
export function TopProductCard({
  data,
  hayVentas,
  locale,
  labels,
}: {
  data: ProductRevenueResponse | null;
  /** Si hubo ingresos en el período, aunque no se hayan podido atribuir a un producto. */
  hayVentas: boolean;
  locale: Locale;
  labels: Dictionary['dashboard']['topProduct'];
}) {
  const moneda = (data?.baseCurrency ?? 'GTQ') as 'GTQ' | 'USD';
  const items = data?.items ?? [];
  const [primero, ...resto] = items;

  return (
    <Card>
      <p className="flex items-center gap-1.5 font-mono text-eyebrow uppercase text-faint">
        <Package className="h-3.5 w-3.5" strokeWidth={1.7} />
        {labels.title}
      </p>

      {!primero ? (
        <p className="mt-2 text-body text-muted-foreground">
          {hayVentas ? labels.emptyUnattributed : labels.emptyNoSales}
        </p>
      ) : (
        <>
          <p className="mt-2 text-cardh2">{primero.name}</p>
          <p className="mt-1 text-kpi tabular-nums">
            {formatMoney(primero.revenue, moneda, locale)}
          </p>
          {resto.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
              {resto.map((p) => (
                <li key={p.productId} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-body">{p.name}</span>
                  <span className="shrink-0 text-body tabular-nums text-muted-foreground">
                    {formatMoney(p.revenue, moneda, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
