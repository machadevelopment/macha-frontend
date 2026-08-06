'use client';

import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { computeRange, type DateRange, type PeriodKey } from '@/lib/period';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Filtro de período del dashboard, siguiendo el prototipo: píldoras para Hoy / Esta
 * semana / Este mes / Este año, y debajo el rango exacto que se está mostrando.
 *
 * La línea de "mostrando" no es decorativa. Las píldoras dicen la INTENCIÓN ("este mes")
 * pero el número que el dueño ve depende del rango REAL, y esos dos se separan en cuanto
 * cambia el día. Sin la línea, "este mes" el día 1 y el día 30 se ven idénticos y
 * explican cifras muy distintas.
 *
 * "Personalizado" todavía no está: elegir dos fechas necesita un selector de calendario
 * y su propia validación. Se omite en vez de dejar una píldora que no hace nada — una
 * opción muerta enseña a desconfiar del resto.
 */
export function PeriodFilter({
  value,
  range,
  onChange,
  locale,
  labels,
}: {
  value: PeriodKey;
  range: DateRange;
  onChange: (key: Exclude<PeriodKey, 'custom'>, range: DateRange) => void;
  locale: Locale;
  labels: Dictionary['dashboard']['period'];
}) {
  const opciones: Array<{ key: Exclude<PeriodKey, 'custom'>; label: string }> = [
    { key: 'today', label: labels.today },
    { key: 'week', label: labels.week },
    { key: 'month', label: labels.month },
    { key: 'year', label: labels.year },
  ];

  const fmt = new Intl.DateTimeFormat(locale === 'es' ? 'es-GT' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  // Las fechas vienen como YYYY-MM-DD; `new Date('2026-08-01')` las lee como UTC y en
  // GMT-6 mostraría el día anterior. Se construyen desde las partes, en local.
  const aFecha = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y!, m! - 1, d!);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-mono text-eyebrow uppercase text-faint">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.label}
        </span>
        <div className="flex flex-wrap gap-1 rounded-pill border border-border bg-card p-1">
          {opciones.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key, computeRange(o.key, new Date()))}
              aria-pressed={value === o.key}
              className={cn(
                'rounded-pill px-3 py-1 text-body transition-colors',
                value === o.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="font-mono text-eyebrow uppercase text-faint">
        {labels.showing}{' '}
        <span className="text-muted-foreground">
          {fmt.format(aFecha(range.from))} – {fmt.format(aFecha(range.to))}
        </span>{' '}
        · {labels.vsPrevious}
      </p>
    </div>
  );
}
