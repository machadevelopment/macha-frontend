'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import {
  computeRange,
  localIsoDate,
  rangeDays,
  rollingRange,
  hayDatosFueraDelRango,
  validateCustomRange,
  type CustomRangeError,
  type DateRange,
  type PeriodKey,
} from '@/lib/period';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Filtro de período, siguiendo el prototipo: píldoras para Hoy / Esta semana / Este mes /
 * Este año / Personalizado, y debajo el rango exacto que se está mostrando.
 *
 * La línea de "mostrando" no es decorativa. Las píldoras dicen la INTENCIÓN ("este mes")
 * pero el número que el dueño ve depende del rango REAL, y esos dos se separan en cuanto
 * cambia el día. Sin la línea, "este mes" el día 1 y el día 30 se ven idénticos y
 * explican cifras muy distintas.
 *
 * ESTE COMPONENTE SE MONTA TRES VECES: `period-kpis.tsx` (Overview), `analytics-client.tsx`
 * y `product-sales-client.tsx`. Se implementa UNA sola vez a propósito (criterio del
 * ticket): tres calendarios con tres validaciones es garantizar que se separen.
 *
 * **Rango personalizado (CU-868knx137).** Antes esta cabecera decía que "Personalizado" se
 * omitía porque le faltaba el selector y su validación, y que una píldora muerta enseña a
 * desconfiar del resto. Ese argumento sigue siendo cierto — por eso la píldora ahora
 * ABRE algo. `PeriodKey` ya contemplaba `'custom'` y el backend ya acepta `from`/`to`
 * arbitrarios; lo único que faltaba era esto.
 *
 * DOS DECISIONES DE IMPLEMENTACIÓN:
 *
 * 1. El calendario es el NATIVO del navegador (`<input type="date">`), no un
 *    react-day-picker. No hay `Popover` ni `Calendar` en `components/ui/`, así que la
 *    alternativa era instalar dos dependencias (`@radix-ui/react-popover` +
 *    `react-day-picker`) para replicar un desplegable que el sistema operativo ya da,
 *    con su localización, su navegación por teclado y su accesibilidad ya resueltas. El
 *    input nativo además acepta `min`/`max`, que es la primera línea de la validación:
 *    las fechas futuras no se pueden ni elegir. Si el rediseño premium (868knx0vh) pide
 *    el calendario exacto del prototipo, ese es su ticket y ya existirá el `Popover`.
 *
 * 2. El panel se despliega EN LÍNEA, debajo de las píldoras, en vez de flotar. En móvil
 *    un popover flotante sobre un input de fecha pelea con el teclado y con el propio
 *    calendario del sistema, que ya es una capa flotante. En línea empuja el contenido y
 *    no tiene nada que posicionar.
 */
export function PeriodFilter({
  value,
  range,
  onChange,
  locale,
  labels,
  dataRange,
}: {
  value: PeriodKey;
  range: DateRange;
  onChange: (key: PeriodKey, range: DateRange) => void;
  locale: Locale;
  labels: Dictionary['dashboard']['period'];
  /**
   * Primer y último día con movimientos de la empresa. Opcional: las pantallas que todavía no
   * lo pasan se comportan igual que antes, sin la nota.
   */
  dataRange?: { from: string; to: string } | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState(range.from);
  const [hasta, setHasta] = useState(range.to);
  const [error, setError] = useState<CustomRangeError | null>(null);

  const opciones: Array<{ key: Exclude<PeriodKey, 'custom'>; label: string }> = [
    { key: 'today', label: labels.today },
    { key: 'week', label: labels.week },
    { key: 'month', label: labels.month },
    { key: 'lastMonth', label: labels.lastMonth },
    { key: 'quarter', label: labels.quarter },
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

  // Tope duro del `<input type="date">`: el navegador no deja elegir más allá de hoy.
  // La validación en JS igual se hace — `max` no cubre el tecleado directo en todos los
  // navegadores, y es el usuario el que decide si escribe o si abre el calendario.
  const hoy = localIsoDate(new Date());

  const mensajeError: Record<CustomRangeError, string> = {
    incomplete: labels.customIncomplete,
    reversed: labels.customReversed,
    future: labels.customFuture,
  };

  /*
   * ═══ EL ERROR SE VE MIENTRAS SE ELIGE, NO AL CONFIRMAR (2026-08-24) ═══
   *
   * Antes la validación corría dentro de `aplicar`: se llenaban los dos campos, se apretaba el
   * botón, y RECIÉN ahí aparecía "la fecha final es anterior a la inicial". Hacer que alguien
   * complete un formulario para enterarse de que estaba mal desde el segundo campo es el error
   * clásico de validar al enviar, y acá se nota más porque el segundo campo se elige en el
   * calendario del sistema: cuando el aviso aparece, esa capa ya se cerró y el contexto se
   * perdió.
   *
   * Se recalcula en cada cambio y el botón queda deshabilitado mientras haya fallo: el aviso
   * explica y el botón apagado impide, que son dos trabajos distintos.
   */
  const fallo = validateCustomRange(desde, hasta, new Date());
  useEffect(() => {
    // Solo se PINTA el error cuando el rango está completo. Mientras falta una fecha, el fallo
    // es `incomplete` y decírselo a alguien que todavía está eligiendo es regañarlo por no
    // haber terminado.
    setError(fallo === 'incomplete' ? null : fallo);
  }, [fallo]);

  function aplicar() {
    if (fallo) {
      setError(fallo);
      return;
    }
    onChange('custom', { from: desde, to: hasta });
    setAbierto(false);
  }

  /**
   * Ventanas móviles: el rango que la gente pide de verdad y que las píldoras no cubren.
   *
   * Las píldoras dan períodos de CALENDARIO y contestan "¿cómo voy en agosto?". "Últimos 30
   * días" contesta "¿cómo vengo últimamente?", que no tiene borde de calendario — y el día 2
   * del mes, "este mes" son dos días de datos.
   *
   * Aplican DIRECTO, sin pasar por los campos ni por Aplicar: un atajo que además hay que
   * confirmar no es un atajo. Los campos quedan para el rango que de verdad es a medida.
   */
  const atajos: Array<{ dias: number; label: string }> = [
    { dias: 7, label: labels.last7 },
    { dias: 30, label: labels.last30 },
    { dias: 90, label: labels.last90 },
  ];

  function aplicarAtajo(dias: number) {
    onChange('custom', rollingRange(dias, new Date()));
    setAbierto(false);
  }

  function alternarPersonalizado() {
    // Al abrir, los inputs arrancan en el rango que se está viendo. Partir de vacío
    // obligaría a elegir dos fechas para ajustar una sola.
    if (!abierto) {
      setDesde(range.from);
      setHasta(range.to);
      setError(null);
    }
    setAbierto((v) => !v);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-mono text-eyebrow uppercase text-faint">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.label}
        </span>
        {/* CU-868kt8bg0: la píldora, al milímetro del prototipo — `p-0.5` en el riel y
            `px-3 py-1 text-xs` en cada botón (el nuestro era `p-1` + 14 px). El control
            baja de ~34 px de alto a ~26 y deja de comportarse como una barra: es un
            control secundario, y a la altura anterior competía con la fila de KPIs que
            está justo debajo. Es literalmente el "aprovechar mejor la pantalla" del
            ticket, en el elemento que se repite en tres pantallas.

            Se asume el área de toque más chica de forma consciente: es un control de
            dashboard, el prototipo es la fuente de verdad declarada del ticket, y las
            píldoras están agrupadas — errar el clic cae en la píldora vecina, no en un
            vacío ni en una acción destructiva. */}
        <div className="flex flex-wrap gap-1 rounded-pill border border-border bg-card p-0.5">
          {opciones.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                setAbierto(false);
                onChange(o.key, computeRange(o.key, new Date()));
              }}
              aria-pressed={value === o.key}
              className={cn(
                'rounded-pill px-3 py-1 text-caption font-medium transition-colors',
                value === o.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {o.label}
            </button>
          ))}
          <button
            type="button"
            onClick={alternarPersonalizado}
            aria-pressed={value === 'custom'}
            aria-expanded={abierto}
            className={cn(
              'rounded-pill px-3 py-1 text-caption font-medium transition-colors',
              value === 'custom'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {labels.custom}
          </button>
        </div>
      </div>

      {abierto && (
        <div
          className="flex flex-col gap-2 rounded-md border border-border bg-card p-3"
          // Escape cierra: el panel se abre desde una píldora y quien lo abrió sin querer
          // espera poder salir sin elegir nada. Va en el contenedor y no en cada campo para
          // que también funcione con el foco en el botón.
          onKeyDown={(e) => {
            if (e.key === 'Escape') setAbierto(false);
          }}
        >
          {/* Los atajos van ARRIBA de los campos, no debajo: son el camino que resuelve la
              mayoría de los casos con un clic, y ponerlos después obligaría a leer primero la
              opción cara. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {atajos.map((a) => (
              <button
                key={a.dias}
                type="button"
                onClick={() => aplicarAtajo(a.dias)}
                className="rounded-pill border border-border px-2.5 py-1 text-caption font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-eyebrow uppercase text-faint">
                {labels.customFrom}
              </span>
              <input
                type="date"
                value={desde}
                max={hoy}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setError(null);
                }}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-body tabular-nums"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-eyebrow uppercase text-faint">{labels.customTo}</span>
              <input
                type="date"
                value={hasta}
                // `min={desde}` hace que el calendario ni siquiera ofrezca un final
                // anterior al inicio, que es el error más fácil de cometer.
                min={desde || undefined}
                max={hoy}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setError(null);
                }}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-body tabular-nums"
              />
            </label>
            <Button size="sm" onClick={aplicar} disabled={fallo !== null}>
              {labels.customApply}
            </Button>
          </div>

          {/* CUÁNTO abarca lo que eligió, antes de aplicarlo. Dos fechas en un calendario no
              dicen si son 30 días o 300 hasta que las cifras cambian — y para entonces el
              dueño no sabe si el salto es de su negocio o del rango que acaba de elegir. */}
          {!fallo && (
            <p className="font-mono text-eyebrow uppercase text-faint">
              {(() => {
                const dias = rangeDays({ from: desde, to: hasta });
                return (dias === 1 ? labels.customSpanOne : labels.customSpanOther).replace(
                  '{n}',
                  String(dias),
                );
              })()}
            </p>
          )}
          {error && (
            // Color como señal de estado, con texto+fondo+borde juntos (design guide §1).
            <p
              role="alert"
              className="rounded-md border border-danger-bd bg-danger-bg px-2 py-1.5 text-body text-danger"
            >
              {mensajeError[error]}
            </p>
          )}
        </div>
      )}

      <p className="font-mono text-eyebrow uppercase text-faint">
        {labels.showing}{' '}
        <span className="text-muted-foreground">
          {fmt.format(aFecha(range.from))} – {fmt.format(aFecha(range.to))}
        </span>{' '}
        · {labels.vsPrevious}
        {/*
          Qué abarca lo que el cliente subió, cuando el período visible deja algo afuera. Sin
          esto, quien carga 19 meses y ve el mes corriente concluye que no le leímos el
          archivo — ver `hayDatosFueraDelRango`. Se calla cuando el período ya cubre todo:
          una advertencia que sale siempre deja de leerse.
        */}
        {hayDatosFueraDelRango(range, dataRange) && (
          <>
            {' '}
            ·{' '}
            <span className="text-muted-foreground">
              {labels.dataSpan
                .replace('{from}', fmt.format(aFecha(dataRange!.from)))
                .replace('{to}', fmt.format(aFecha(dataRange!.to)))}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
