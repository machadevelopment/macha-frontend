'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { request, requestJson, type RequestError } from '@/lib/api/browser';
import { isKnownRule, RULE_UNIT, type RuleKey } from '@/lib/alerts/rule-units';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Configuración de reglas de alerta POR EMPRESA (ronda de QA 2026-08-11).
 *
 * `/alerts` solo mostraba el histórico de alertas ya disparadas. Ajustar un umbral —"quiero
 * que me avises a los 90 días de vencido, no a los 60"— obligaba a escribirle a Macha, aunque
 * el backend lleva desde CU-868kh8pwv exponiendo `GET /alert-rules` y
 * `PATCH /alert-rules/:ruleKey` para que el cliente lo haga solo. Faltaba únicamente esto.
 *
 * ALCANCE, tal cual el ticket: solo las seis reglas que YA existen. No se crean reglas ni
 * "variables" nuevas — el catálogo es fijo y determinista, sin IA, por diseño.
 *
 * QUIÉN EDITA. Owner y administrador; el `member` solo lee. La autoridad es el backend
 * (`assertClientCapability(role, 'configure_alerts')`), y esto es únicamente para no pintar
 * controles que van a devolver 403 — el mismo criterio que `lib/auth/active-role.ts`
 * documenta. Al `member` no se le muestran inputs deshabilitados sino los VALORES: saber con
 * qué umbrales trabaja su empresa le sirve; un formulario que no puede tocar, no.
 *
 * TEXTOS. El nombre y la descripción de cada regla salen del diccionario ES/EN, no del
 * `label` que manda el backend: el catálogo de macha-backend es español-only y esta pantalla
 * es del cliente. La unidad sale de `RULE_UNIT`, el espejo local del catálogo que ya existía.
 *
 * `notifyImmediately` se MUESTRA pero no se edita, y esto no es un olvido: cuáles son las
 * tres reglas de liquidez que mandan correo al instante es una decisión de producto cerrada
 * (CU-868kfv993). Si fuera configurable, todo el catálogo acabaría en correo inmediato y el
 * cliente dejaría de abrirlos — justo lo que esa decisión evita. El backend tampoco lo acepta
 * en el `PATCH`.
 */

interface AlertRule {
  ruleKey: string;
  label: string;
  unit: 'percent' | 'days' | null;
  threshold: number;
  enabled: boolean;
  notifyImmediately: boolean;
}

/** Estado de guardado de UNA fila. Por fila y no global: se editan de a una. */
type FilaEstado =
  | { tipo: 'idle' }
  | { tipo: 'guardando' }
  | { tipo: 'guardado' }
  | { tipo: 'error'; mensaje: string };

export function AlertRulesPanel({
  labels,
  ruleLabels,
  unitLabels,
  common,
  canEdit,
}: {
  labels: Dictionary['alerts']['config'];
  ruleLabels: Dictionary['alerts']['rule'];
  unitLabels: Dictionary['alerts']['unit'];
  common: Dictionary['common'];
  canEdit: boolean;
}) {
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [loadError, setLoadError] = useState<RequestError | null>(null);

  useEffect(() => {
    void request<{ rules: AlertRule[] }>('/api/alert-rules').then((result) => {
      if (result.ok) setRules(result.data.rules);
      else setLoadError(result.error);
    });
  }, []);

  if (loadError) {
    return (
      <LoadError error={loadError} labels={common.loadError} onRetry={() => location.reload()} />
    );
  }
  if (!rules) return null;
  if (rules.length === 0) {
    return <p className="text-body text-muted-foreground">{labels.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-cardh2">{labels.title}</p>
        <p className="text-body text-muted-foreground">
          {canEdit ? labels.subtitle : labels.readOnly}
        </p>
      </div>

      {rules.map((rule) => (
        <ReglaCard
          key={rule.ruleKey}
          rule={rule}
          labels={labels}
          ruleLabels={ruleLabels}
          unitLabels={unitLabels}
          canEdit={canEdit}
          onSaved={(patch) =>
            setRules((prev) =>
              (prev ?? []).map((r) => (r.ruleKey === rule.ruleKey ? { ...r, ...patch } : r)),
            )
          }
        />
      ))}
    </div>
  );
}

function ReglaCard({
  rule,
  labels,
  ruleLabels,
  unitLabels,
  canEdit,
  onSaved,
}: {
  rule: AlertRule;
  labels: Dictionary['alerts']['config'];
  ruleLabels: Dictionary['alerts']['rule'];
  unitLabels: Dictionary['alerts']['unit'];
  canEdit: boolean;
  onSaved: (patch: Partial<AlertRule>) => void;
}) {
  // El input se maneja como TEXTO, no como número. Con `useState<number>` un campo vacío
  // a mitad de edición se vuelve `NaN` y el input salta a "0" mientras el usuario borra
  // para escribir otra cifra.
  const [umbral, setUmbral] = useState(String(rule.threshold));
  const [estado, setEstado] = useState<FilaEstado>({ tipo: 'idle' });

  const conocida = isKnownRule(rule.ruleKey);
  const key = rule.ruleKey as RuleKey;
  // Una regla que exista en el catálogo del backend pero todavía no aquí se degrada a
  // mostrar el label crudo del backend, nunca a romper la pantalla (mismo criterio que
  // `isKnownRule` documenta).
  const nombre = conocida ? ruleLabels[key] : rule.label;
  const descripcion = conocida ? labels.description[key] : null;
  const unidad = rule.unit ?? (conocida ? RULE_UNIT[key] : null);
  const unidadTexto = unidad ? unitLabels[unidad] : '';

  async function guardar(patch: { threshold?: number; enabled?: boolean }) {
    setEstado({ tipo: 'guardando' });
    const result = await requestJson<AlertRule>(
      `/api/alert-rules/${encodeURIComponent(rule.ruleKey)}`,
      'PATCH',
      patch,
    );
    if (!result.ok) {
      /*
       * El backend valida el umbral por unidad y responde 422 con el motivo exacto
       * ("Un umbral en porcentaje debe estar entre 0 y 100"). Ese texto es la instrucción
       * de qué corregir, así que se muestra tal cual — `proxyMutation` lo conserva justo
       * para esto. Solo si no vino nada se cae al mensaje genérico.
       */
      const body = result.error.body;
      const delBackend =
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { error?: unknown }).error === 'string'
          ? (body as { error: string }).error
          : null;
      setEstado({ tipo: 'error', mensaje: delBackend ?? labels.saveFailed });
      return;
    }
    onSaved(result.data);
    setUmbral(String(result.data.threshold));
    setEstado({ tipo: 'guardado' });
  }

  function guardarUmbral() {
    const valor = Number(umbral);
    // No se valida acá el rango: la autoridad es el backend, y duplicar sus reglas en el
    // cliente es garantizar que se separen. Solo se evita mandar basura no numérica.
    if (!Number.isFinite(valor)) {
      setEstado({ tipo: 'error', mensaje: labels.saveFailed });
      return;
    }
    void guardar({ threshold: valor });
  }

  const sinCambios = String(rule.threshold) === umbral.trim();

  return (
    <Card className={cn('flex flex-col gap-3', !rule.enabled && 'opacity-70')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-cardh2">{nombre}</p>
          {descripcion && (
            <p className="mt-0.5 max-w-[68ch] text-body text-muted-foreground">{descripcion}</p>
          )}
          <p className="mt-1 font-mono text-eyebrow uppercase text-faint">
            {rule.notifyImmediately ? labels.notifyImmediately : labels.notifyBatched}
          </p>
        </div>

        {canEdit ? (
          <Interruptor
            encendida={rule.enabled}
            etiqueta={rule.enabled ? labels.enabledOn : labels.enabledOff}
            ocupado={estado.tipo === 'guardando'}
            onToggle={() => void guardar({ enabled: !rule.enabled })}
          />
        ) : (
          <span className="font-mono text-eyebrow uppercase text-faint">
            {rule.enabled ? labels.enabledOn : labels.enabledOff}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-eyebrow uppercase text-faint">
            {labels.thresholdLabel}
          </span>
          {canEdit ? (
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="numeric"
                value={umbral}
                // `step`/`min` acompañan a la validación del backend, no la sustituyen:
                // los días son enteros ≥ 1 y los porcentajes van de 0 a 100.
                min={unidad === 'days' ? 1 : 0}
                max={unidad === 'percent' ? 100 : undefined}
                step={unidad === 'days' ? 1 : 'any'}
                onChange={(e) => {
                  setUmbral(e.target.value);
                  setEstado({ tipo: 'idle' });
                }}
                className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-body tabular-nums"
              />
              <span className="text-body text-muted-foreground">{unidadTexto}</span>
            </span>
          ) : (
            <span className="text-body tabular-nums">
              {rule.threshold} {unidadTexto}
            </span>
          )}
        </label>

        {canEdit && (
          <Button
            size="sm"
            onClick={guardarUmbral}
            disabled={estado.tipo === 'guardando' || sinCambios}
          >
            {estado.tipo === 'guardando' ? labels.saving : labels.save}
          </Button>
        )}

        {estado.tipo === 'guardado' && (
          <span className="flex items-center gap-1 text-body text-success">
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            {labels.saved}
          </span>
        )}
      </div>

      {estado.tipo === 'error' && (
        // Color como señal de estado, con texto+fondo+borde juntos (design guide §1).
        <p
          role="alert"
          className="rounded-md border border-danger-bd bg-danger-bg px-2 py-1.5 text-body text-danger"
        >
          {estado.mensaje}
        </p>
      )}
    </Card>
  );
}

/**
 * Interruptor activar/apagar.
 *
 * Se escribe a mano en vez de instalar `@radix-ui/react-switch`: son doce líneas y
 * `role="switch"` + `aria-checked` es exactamente lo que un lector de pantalla necesita.
 * Si el rediseño premium trae un `Switch` a `components/ui/`, esto se reemplaza por él.
 */
function Interruptor({
  encendida,
  etiqueta,
  ocupado,
  onToggle,
}: {
  encendida: boolean;
  etiqueta: string;
  ocupado: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendida}
      aria-label={etiqueta}
      disabled={ocupado}
      onClick={onToggle}
      className="flex shrink-0 items-center gap-2 disabled:opacity-50"
    >
      <span
        className={cn(
          'relative h-5 w-9 rounded-pill border transition-colors',
          encendida ? 'border-success-bd bg-success' : 'border-border bg-soft',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-pill bg-card transition-all',
            encendida ? 'left-[18px]' : 'left-0.5',
          )}
        />
      </span>
      <span className="font-mono text-eyebrow uppercase text-muted-foreground">{etiqueta}</span>
    </button>
  );
}
