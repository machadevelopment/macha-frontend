'use client';

import { useEffect, useState } from 'react';
import { Check, Circle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PeriodFilter } from '@/components/dashboard/period-filter';
import { computeRange, type DateRange, type PeriodKey } from '@/lib/period';
import { request, requestJson } from '@/lib/api/browser';
import { formatNumber } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Generador de reportes a demanda (ticket B2, ronda de QA 2026-08-11).
 *
 * Reportes era una lista pasiva que llenaba un cron: el usuario no elegía nada y no podía
 * descargar más que HTML. Ahora elige tipo, período, secciones e instrucciones, y descarga
 * en PDF o Excel.
 *
 * ═══ LA GENERACIÓN ES ASÍNCRONA, Y LA PANTALLA NO LO DISIMULA ═══
 *
 * El backend responde **202 `queued`**: encola el trabajo y devuelve. No hay un PDF al
 * final del clic. Sería fácil poner un spinner y hacer polling hasta que aparezca, y
 * sería peor: una llamada a Claude sobre un año de datos puede tardar, y un spinner
 * indefinido convierte "se está trabajando" en "se colgó". Se dice explícitamente que
 * quedó en cola y que va a aparecer en el historial de abajo.
 *
 * ═══ EL PERÍODO REUSA `PeriodFilter` ═══
 *
 * El mismo componente de Overview/Analytics/Product sales, con su rango personalizado y
 * sus validaciones (CU-868knx137). Escribir un segundo selector de fechas acá habría
 * duplicado la validación de "fin no anterior al inicio" y "sin futuro", que es
 * exactamente como se separan dos implementaciones de la misma regla.
 *
 * ═══ LOS TOPES VIENEN DEL BACKEND ═══
 *
 * `maxRangeDays` y `maxInstructionsLength` llegan en el catálogo en vez de estar
 * duplicados acá. Son reglas del backend —el rango se limita porque la serie diaria viaja
 * entera al prompt y al snapshot del ledger— y una copia local se desincroniza en
 * silencio: la pantalla dejaría pasar lo que el backend rechaza, o al revés.
 */

interface Catalogo {
  types: Array<{ type: string; defaultSections: string[] }>;
  sections: Array<{ section: string; labelEs: string; labelEn: string }>;
  maxRangeDays: number;
  maxInstructionsLength: number;
}

type Estado =
  | { tipo: 'idle' }
  | { tipo: 'generando' }
  | { tipo: 'encolado'; creditos: number }
  | { tipo: 'error'; mensaje: string };

export function ReportBuilder({
  locale,
  labels,
  periodLabels,
  canGenerate,
  onQueued,
}: {
  locale: Locale;
  labels: Dictionary['reports']['builder'];
  periodLabels: Dictionary['dashboard']['period'];
  canGenerate: boolean;
  /** Recarga el historial: el reporte encolado va a aparecer ahí. */
  onQueued: () => void;
}) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<PeriodKey>('month');
  const [rango, setRango] = useState<DateRange>(() => computeRange('month', new Date()));
  const [secciones, setSecciones] = useState<string[]>([]);
  const [instrucciones, setInstrucciones] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'idle' });

  useEffect(() => {
    void request<Catalogo>('/api/reports/catalog').then((r) => {
      if (!r.ok) return; // Sin catálogo no se puede construir el formulario; queda oculto.
      setCatalogo(r.data);
      const primero = r.data.types[0];
      if (primero) {
        setTipo(primero.type);
        // Las secciones arrancan en las que ese tipo trae por defecto, que es la respuesta
        // del backend a "qué es un Executive summary". Arrancar con ninguna obligaría a
        // armar el reporte desde cero para el caso más común.
        setSecciones(primero.defaultSections);
      }
    });
  }, []);

  if (!catalogo || !tipo) return null;

  const etiquetaSeccion = (s: Catalogo['sections'][number]) =>
    locale === 'es' ? s.labelEs : s.labelEn;

  function alternarSeccion(section: string) {
    setEstado({ tipo: 'idle' });
    setSecciones((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    );
  }

  function cambiarTipo(nuevo: string) {
    setTipo(nuevo);
    setEstado({ tipo: 'idle' });
    // Cambiar de tipo REEMPLAZA las secciones por las suyas por defecto. Conservar la
    // selección anterior dejaría un "Executive summary" con las secciones de otro tipo,
    // que se ve igual pero no es lo que el nombre promete.
    const def = catalogo?.types.find((t) => t.type === nuevo)?.defaultSections;
    if (def) setSecciones(def);
  }

  async function generar() {
    setEstado({ tipo: 'generando' });
    const result = await requestJson<{ reportId: string; creditsRequired: number }>(
      '/api/reports/generate',
      'POST',
      {
        reportType: tipo,
        from: rango.from,
        to: rango.to,
        sections: secciones,
        ...(instrucciones.trim() ? { instructions: instrucciones.trim() } : {}),
      },
    );

    if (!result.ok) {
      setEstado({ tipo: 'error', mensaje: mensajeDeFallo(result.error.body, labels) });
      return;
    }
    setEstado({ tipo: 'encolado', creditos: result.data.creditsRequired });
    setInstrucciones('');
    onQueued();
  }

  return (
    <Card className="mb-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-faint" strokeWidth={1.8} aria-hidden />
        <div>
          <p className="text-cardh2">{labels.title}</p>
          <p className="text-body text-muted-foreground">
            {canGenerate ? labels.subtitle : labels.readOnly}
          </p>
        </div>
      </div>

      {canGenerate && (
        <>
          {/* Un solo tipo hoy ("Executive summary"): el selector se esconde en vez de
              mostrar un desplegable con una sola opción, que solo ocupa espacio y
              sugiere una elección que no existe. Aparece solo si el catálogo crece. */}
          {catalogo.types.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-type">{labels.typeLabel}</Label>
              <select
                id="report-type"
                value={tipo}
                onChange={(e) => cambiarTipo(e.target.value)}
                className="h-9 max-w-xs rounded-md border border-border bg-background px-3 text-body"
              >
                {catalogo.types.map((t) => (
                  <option key={t.type} value={t.type}>
                    {labels.type[t.type] ?? t.type}
                  </option>
                ))}
              </select>
            </div>
          )}

          <PeriodFilter
            value={periodo}
            range={rango}
            onChange={(key, r) => {
              setPeriodo(key);
              setRango(r);
              setEstado({ tipo: 'idle' });
            }}
            locale={locale}
            labels={periodLabels}
          />

          {/*
            CU-868krvrxy + CU-868kt2hw3 — "Qué incluir" estaba muy apretada.

            Tres cambios, y ninguno es solo aire:

              · `gap-3` entre la etiqueta y las opciones, y `gap-2` entre pills. Con
                `gap-1.5` las siete opciones se leían como un bloque continuo y había que
                fijarse para separar dónde termina una y empieza la otra.
              · `py-1.5` en vez de `py-1`: el área de toque de una pill de `py-1` queda por
                debajo de lo cómodo en un teléfono, que es donde más se toca este control.
              · Y sobre todo el ÍCONO DE ESTADO. Antes la única señal de "seleccionada" era
                la inversión de color. Eso obliga a comparar unas pills contra otras para
                saber cuáles están puestas, y en modo oscuro la diferencia se estrecha. El
                check/círculo lo dice por sí solo, sin comparar y sin depender del color —
                que es además la regla del design guide: el color nunca es la única señal.
          */}
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-mono text-eyebrow uppercase text-faint">
              {labels.sectionsLabel}
            </legend>
            <div className="flex flex-wrap gap-2">
              {catalogo.sections.map((s) => {
                const activa = secciones.includes(s.section);
                return (
                  <button
                    key={s.section}
                    type="button"
                    onClick={() => alternarSeccion(s.section)}
                    aria-pressed={activa}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-body transition-colors',
                      activa
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {/* `aria-hidden`: el estado ya lo anuncia `aria-pressed`, y un lector de
                        pantalla que además leyera el ícono diría el mismo dato dos veces. */}
                    {activa ? (
                      <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} aria-hidden />
                    )}
                    {etiquetaSeccion(s)}
                  </button>
                );
              })}
            </div>
            {/* El backend exige al menos una sección (`minItems: 1`). Se avisa acá en vez
                de dejar que el 422 lo explique después de un viaje de red. */}
            {secciones.length === 0 && (
              <p className="text-body text-muted-foreground">{labels.sectionsRequired}</p>
            )}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-instructions">{labels.instructionsLabel}</Label>
            {/* `rows={4}` y no 2: con dos renglones el campo se leía como una nota al pie y
                no como algo que de verdad se espera que el usuario llene. El tope real lo
                pone `maxInstructionsLength`, que viene del backend. */}
            <Textarea
              id="report-instructions"
              rows={4}
              maxLength={catalogo.maxInstructionsLength}
              placeholder={labels.instructionsPlaceholder}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* El destello acompaña al botón, igual que al título: es la acción que invoca a
                la IA, y el mismo sello que marca el resto de lo que escribe Macha. */}
            <Button
              onClick={generar}
              disabled={estado.tipo === 'generando' || !secciones.length}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              {estado.tipo === 'generando' ? labels.generating : labels.generate}
            </Button>

            {estado.tipo === 'encolado' && (
              /*
                Se dice que quedó EN COLA, no que está listo. El backend responde 202 y el
                trabajo corre en pg-boss: prometer un PDF que todavía no existe es peor que
                pedir paciencia. También se dice cuántos créditos costó — es plata del
                cliente y enterarse por el saldo es enterarse tarde.
              */
              <p className="rounded-md border border-success-bd bg-success-bg px-2.5 py-1.5 text-body text-success">
                {labels.queued.replace('{n}', formatNumber(estado.creditos, locale))}
              </p>
            )}
          </div>

          {estado.tipo === 'error' && (
            <p
              role="alert"
              className="rounded-md border border-danger-bd bg-danger-bg px-2.5 py-1.5 text-body text-danger"
            >
              {estado.mensaje}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * Traduce el cuerpo del fallo a algo accionable.
 *
 * El 402 trae `{ required, balance }` y es el caso que más importa: "necesitás 5 créditos
 * y tenés 2" le dice al dueño que la salida es comprar créditos. Un "no se pudo generar"
 * genérico lo dejaría reintentando contra el mismo muro — es el mismo error que
 * CU-868kkgav2 arregló en el panel de insights.
 */
function mensajeDeFallo(body: unknown, labels: Dictionary['reports']['builder']): string {
  if (typeof body !== 'object' || body === null) return labels.error;
  const b = body as { error?: unknown; required?: unknown; balance?: unknown; reason?: unknown };

  if (b.error === 'insufficient_credits' && typeof b.required === 'number') {
    return labels.insufficientCredits
      .replace('{required}', String(b.required))
      .replace('{balance}', String(b.balance ?? 0));
  }
  if (b.reason === 'queue_full') return labels.queueFull;
  // Cualquier otro `error` del backend es texto ya redactado para el usuario (el rango
  // fuera de tope, por ejemplo). Se muestra tal cual.
  if (typeof b.error === 'string') return b.error;
  return labels.error;
}
