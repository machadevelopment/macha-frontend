'use client';

import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import type { VistaDeMonedaHook } from '@/components/money/display-currency';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL BOTÓN PARA VER LAS CIFRAS EN LA OTRA MONEDA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Tres piezas, y las tres son obligatorias juntas:
 *
 *   1. el selector de moneda;
 *   2. **la tasa con la que se convirtió, visible cuando está convertido**;
 *   3. la aclaración de que es una vista y no la contabilidad.
 *
 * La (2) y la (3) no son adorno. El PRD §6 pide que "la moneda aplicada, la tasa usada... son
 * siempre visibles", y acá pesa más que de costumbre: una cifra convertida en pantalla NO es
 * la que está escrita en la base. Sin la tasa a la vista, el usuario no tiene forma de saber
 * cuál de las dos está mirando ni de reproducir el número.
 *
 * ═══ SIN TASA NO HAY BOTÓN: HAY UNA INVITACIÓN A CONFIGURARLA ═══
 *
 * Es la mitad del flujo que pidió Keneth —*"que le pida configurar el TC"*— y por eso el
 * estado `sin-tasa` no pinta un control deshabilitado. Un botón apagado no dice qué falta ni
 * dónde arreglarlo; el enlace a Ajustes sí. Es el mismo criterio que ya usa el mensaje de
 * `missing_fx_rate` en la ingesta: decir la acción concreta, no el estado.
 *
 * ═══ SE PINTA `esBase` Y NO LA ELECCIÓN DEL USUARIO ═══
 *
 * `vista.moneda` sale del hook, que cae a la base cuando no hay tasa utilizable aunque el
 * usuario haya pedido la otra. Pintar la elección en vez del resultado dejaría el botón
 * marcando "USD" con las cifras en quetzales — exactamente el fallo que hay que hacer
 * imposible.
 */
export function CurrencyToggle({
  locale,
  labels,
  v,
  className,
}: {
  locale: Locale;
  labels: Dictionary['dashboard']['viewCurrency'];
  v: VistaDeMonedaHook;
  className?: string;
}) {
  // Mientras no se sabe si hay tasa no se ofrece nada: mostrar el control y retirarlo al
  // llegar la respuesta es peor que esperar un instante.
  if (v.estado === 'cargando' || v.estado === 'no-aplica') return null;

  if (v.estado === 'sin-tasa') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <p className="text-micro text-muted-foreground">
          {labels.missingRate.replace('{currency}', v.otra)}
        </p>
        <Link
          href="/settings"
          className="rounded-pill border border-border px-2.5 py-1 text-micro font-medium text-foreground transition-colors hover:border-foreground"
        >
          {labels.configure}
        </Link>
      </div>
    );
  }

  const opciones = [v.base, v.otra] as const;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="font-mono text-eyebrow uppercase text-faint">{labels.label}</span>
      {/*
        `radiogroup` y no un `tablist`: son dos representaciones del MISMO contenido, no dos
        paneles distintos. Un lector de pantalla anuncia "1 de 2 seleccionado", que es lo que
        está pasando.
      */}
      <div role="radiogroup" className="flex rounded-pill border border-border bg-card p-0.5">
        {opciones.map((moneda) => {
          const activa = v.vista.moneda === moneda;
          return (
            <button
              key={moneda}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => {
                if (!activa) v.alternar();
              }}
              className={cn(
                'rounded-pill px-2.5 py-1 font-mono text-micro font-medium transition-colors',
                activa
                  ? 'bg-foreground text-canvas'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {moneda}
            </button>
          );
        })}
      </div>

      {!v.vista.esBase && (
        /*
          La tasa y la aclaración solo existen mientras se está mirando convertido. En la
          moneda base no hay nada que aclarar —esas cifras SON las de la contabilidad— y un
          aviso permanente se vuelve invisible justo cuando hace falta.

          `ArrowLeftRight` marca visualmente que lo de al lado es una conversión, y el texto
          dice lo mismo sin depender del ícono.
        */
        <p className="flex items-center gap-1.5 text-micro text-muted-foreground">
          <ArrowLeftRight aria-hidden className="h-3 w-3 shrink-0" strokeWidth={1.7} />
          <span>
            {labels.convertedAt
              .replace('{currency}', v.vista.moneda)
              .replace('{rate}', formatNumber(v.vista.tasa.rate, locale, 4))
              .replace('{date}', formatDate(v.vista.tasa.effectiveDate, locale))}{' '}
            {labels.notAccounting.replace('{currency}', v.base)}
          </span>
        </p>
      )}
    </div>
  );
}
