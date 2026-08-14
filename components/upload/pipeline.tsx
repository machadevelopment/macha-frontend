import { cn } from '@/lib/cn';
import type { Dictionary } from '@/lib/i18n/dictionary';

export type DocumentStatus =
  | 'queued'
  | 'processing'
  | 'review'
  | 'promoted'
  | 'reverted'
  | 'failed'
  /** Terminal: el archivo no traía movimientos legibles. Reintentarlo da lo mismo. */
  | 'unsupported'
  /**
   * Terminal: el CLIENTE paró la carga. Deliberadamente distinto de `failed` — una carga que
   * el usuario decidió parar no salió mal, y mezclarlas impediría ver en el panel si la
   * ingesta está sana o si la gente está cancelando porque tarda.
   */
  | 'cancelled';

const STEP_ORDER = ['queued', 'processing', 'review', 'promoted'] as const;
type StepState = 'done' | 'now' | 'wait' | 'failed';

/**
 * design guide.md §5 "Pipeline (4 pasos)" (`.pipe .st.done/now/wait`, + `failed`).
 * We only have the document's current terminal-or-in-flight status, not per-step
 * timestamps, so `failed` is attributed to the "processing" step — that's where the
 * worker's single try/catch (queue/workers/excel-ingest.ts) can fail in practice
 * (template resolution, S3 download, any batch's Claude call, or promotion).
 * `reverted` renders as if fully done — reversion is a separate later admin action,
 * not a 5th pipeline step.
 */
function getStepStates(status: DocumentStatus): StepState[] {
  // `unsupported` se atribuye al mismo paso que `failed`: el archivo se recibió y se
  // procesó, y fue ahí donde se determinó que no había nada legible.
  if (status === 'failed' || status === 'unsupported') return ['done', 'failed', 'wait', 'wait'];
  if (status === 'reverted') return ['done', 'done', 'done', 'done'];
  const idx = STEP_ORDER.indexOf(status as (typeof STEP_ORDER)[number]);
  return STEP_ORDER.map((_, i) => (i < idx ? 'done' : i === idx ? 'now' : 'wait'));
}

const stateClasses: Record<StepState, string> = {
  done: 'bg-success-bg text-success border-success-bd',
  now: 'bg-warning-bg text-warning border-warning-bd',
  wait: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-danger-bg text-danger border-danger-bd',
};

export function DocumentPipeline({
  status,
  labels,
}: {
  status: DocumentStatus;
  labels: Dictionary['upload']['step'];
}) {
  const states = getStepStates(status);
  const stepLabels = [labels.queued, labels.processing, labels.review, labels.promoted];

  return (
    <div className="flex items-center gap-1.5">
      {STEP_ORDER.map((step, i) => (
        <div
          key={step}
          className={cn(
            'flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-chip uppercase',
            stateClasses[states[i]!],
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {stepLabels[i]}
        </div>
      ))}
    </div>
  );
}
