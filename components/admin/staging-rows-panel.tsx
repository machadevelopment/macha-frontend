'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { StagingRowFields, type Payload } from '@/components/admin/staging-row-fields';
import { request, requestJson } from '@/lib/api/browser';
import { usePagedList } from '@/lib/api/use-paged-list';
import { parseFlagReason, type ParsedFlagReason } from '@/lib/staging/flag-reason';
import { formatPct } from '@/lib/format';

interface StagingRow {
  id: string;
  companyId: string;
  /** CU-868khvzqn: lo agrega el join del backend (`modules/admin/staging-rows.ts`),
   * igual que en `/admin/documents`. El UUID solo no le dice nada a un operador. */
  companyName: string;
  targetEntity: string;
  payload: Record<string, unknown>;
  confidence: string | null;
  flagReason: string | null;
  reviewStatus: string;
}

const PAGE_SIZE = 50;

/**
 * Bandeja de revisión de filas marcadas — rehecha para que se entienda (ronda de QA
 * 2026-08-11).
 *
 * QUÉ ES ESTA PANTALLA. Cuando un cliente sube su Excel, la IA clasifica cada fila; las
 * dudosas caen acá para que un analista de Macha las valide antes de que entren a la
 * contabilidad real del cliente. Es trabajo de sentido común, no técnico.
 *
 * Y sin embargo pedía leer JSON. La fila se pintaba como `JSON.stringify(payload, null, 2)`
 * dentro de un textarea —llaves, comillas y claves camelCase en inglés— y el motivo del
 * marcado salía crudo: `low_confidence:0.30`, `invalid_date`. El analista traducía códigos
 * en inglés y editaba JSON sin romper la sintaxis, con un "El payload no es JSON válido"
 * esperándolo si se comía una coma.
 *
 * QUÉ CAMBIA:
 *   · el payload pasa a ser una ficha de campos etiquetados y editables
 *     (`staging-row-fields.tsx`);
 *   · el motivo se traduce desde su código (`lib/staging/flag-reason.ts` + diccionario);
 *   · se dice qué se espera del operador, que no estaba escrito en ningún lado;
 *   · `targetEntity` deja de ser un badge que dice `transaction` y pasa a "Movimiento";
 *   · las tres acciones dejan de estar quemadas en español en el JSX — el backoffice es
 *     bilingüe por decisión de Jose (CU-868kh8zvt) y estas tres eran una fuga.
 *
 * LO QUE NO CAMBIA: las tres acciones siguen siendo las mismas (aprobar, rechazar,
 * re-extraer sin costo de créditos) y toda mutación sigue pasando por el mismo `PATCH`,
 * así que la auditoría en `admin_audit_log` queda intacta.
 */
export function StagingRowsPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['stagingRows'];
  common: Dictionary['admin']['common'];
}) {
  /** Payload editado por fila. Arranca como copia del que vino del backend. */
  const [drafts, setDrafts] = useState<Record<string, Payload>>({});
  /** Respaldo en JSON, solo para entidades que esta pantalla no sabe pintar. */
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  /** Error por fila: cada una se aprueba/rechaza por separado. */
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const { state, loadMore, loadingMore, moreError, reload } = usePagedList<StagingRow>(
    useCallback(async (offset) => {
      const result = await request<{ rows: StagingRow[]; hasMore: boolean }>(
        `/api/admin/staging-rows?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      if (!result.ok) return result;
      const nuevos = result.data.rows;
      setDrafts((prev) => ({
        ...(offset === 0 ? {} : prev),
        ...Object.fromEntries(nuevos.map((r) => [r.id, { ...r.payload }])),
      }));
      setJsonDrafts((prev) => ({
        ...(offset === 0 ? {} : prev),
        ...Object.fromEntries(nuevos.map((r) => [r.id, JSON.stringify(r.payload, null, 2)])),
      }));
      return {
        ok: true as const,
        data: { items: nuevos, hasMore: result.data.hasMore },
      };
    }, []),
  );

  function setRowError(id: string, message: string | null) {
    setRowErrors((prev) => {
      const next = { ...prev };
      if (message === null) delete next[id];
      else next[id] = message;
      return next;
    });
  }

  /**
   * CU-868kkgb3c: aprobar una fila la promueve a la contabilidad REAL del cliente
   * (`document_staging_rows` → transactions/invoices/bills). Esto no miraba `res.ok`:
   * un rechazo del backend se veía igual que un éxito —la lista recargaba y la fila
   * seguía ahí— y el staff no tenía forma de saber si lo que aprobó entró o no.
   */
  async function approve(row: StagingRow, reject = false) {
    let payload: unknown;
    if (drafts[row.id]) {
      payload = drafts[row.id];
    } else {
      // Camino de respaldo (entidad desconocida): sigue siendo JSON escrito a mano, así
      // que sigue necesitando su red — un JSON malformado lanzaba dentro del onClick y
      // no pasaba nada visible.
      try {
        payload = JSON.parse(jsonDrafts[row.id] ?? '{}');
      } catch {
        setRowError(row.id, labels.invalidJson);
        return;
      }
    }
    setRowError(row.id, null);
    const result = await requestJson(`/api/admin/staging-rows/${row.id}`, 'PATCH', {
      payload,
      reviewStatus: reject ? 'rejected' : 'approved',
    });
    if (!result.ok) {
      setRowError(row.id, labels.saveError);
      return;
    }
    reload();
  }

  async function reextract(id: string) {
    setRowError(id, null);
    const result = await requestJson(`/api/admin/staging-rows/${id}/reextract`, 'POST');
    if (!result.ok) {
      setRowError(id, labels.reextractError);
      return;
    }
    reload();
  }

  /*
   * ═══ EL MARCO DE LA PANTALLA VA ANTES DE TODOS LOS RETURNS (2026-08-20) ═══
   *
   * Jose: "está muy compleja, no se logra entender qué tiene que hacer el equipo de MACHA
   * ahí". Cada FILA ya se explicaba sola; lo que faltaba era la COLA.
   *
   * Y va arriba de los cortes por estado a propósito, porque el caso que más necesita
   * contexto es el que antes se quedaba sin ninguno: **la cola vacía**. Alguien entraba, leía
   * "Sin filas pendientes de revisión" y no tenía forma de saber si eso significaba que la
   * pantalla estaba rota, que no le tocaba nada, o que todavía no había cargado. Es el estado
   * más frecuente de una cola sana y era el único sin explicación.
   */
  const marco = (
    <div className="flex flex-col gap-1.5">
      <p className="text-body text-muted-foreground">{labels.intro}</p>
      {/* Qué NO le toca a este equipo. Va en su propio párrafo porque es la mitad que evita
          trabajo de más, no la que explica el trabajo. */}
      <p className="text-body text-faint">{labels.introScope}</p>
    </div>
  );

  if (state.status === 'loading') return marco;
  if (state.status === 'error')
    return (
      <div className="flex flex-col gap-3">
        {marco}
        <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />
      </div>
    );

  const rows = state.items;
  if (rows.length === 0)
    return (
      <div className="flex flex-col gap-3">
        {marco}
        <p className="text-body text-muted-foreground">{labels.empty}</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {marco}

      {rows.map((row) => (
        <Card key={row.id}>
          {/* CU-868khvzqn: la empresa encabeza la card y no es un dato más al margen.
              La lista mezcla tenants (viene ordenada por fecha, no agrupada), así que
              es lo primero que hay que leer antes de aprobar o rechazar: lo que se
              apruebe acá se promueve a la contabilidad de ese cliente. */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-eyebrow uppercase text-faint">{labels.companyEyebrow}</p>
              <p className="truncate text-cardh2">{row.companyName}</p>
            </div>
            <Badge variant="warning">{nombreEntidad(row.targetEntity, labels)}</Badge>
          </div>

          <MotivoDelMarcado flagReason={row.flagReason} labels={labels} />

          {/*
            `instructions` ("Revisa ESTA fila: corrige lo que esté mal y apruébala…") se movió
            acá desde el encabezado de la pantalla. El texto no cambió —el ticket pide
            conservarlo— pero arriba de una lista de veinte filas decía "esta fila" sin que
            hubiera una: era una instrucción de acción ocupando el lugar del marco general, que
            es lo que faltaba. Junto a los campos y los botones de SU tarjeta, el "esta" tiene
            a qué referirse.
          */}
          <p className="mt-3 text-body text-muted-foreground">{labels.instructions}</p>

          <StagingRowFields
            targetEntity={row.targetEntity}
            payload={drafts[row.id] ?? row.payload}
            labels={labels}
            onChange={(patch) =>
              setDrafts((prev) => ({
                // Se parte del payload ORIGINAL, no de `{}`: un campo que el extractor
                // agregue mañana y esta ficha no pinte tiene que viajar intacto al PATCH.
                ...prev,
                [row.id]: { ...(prev[row.id] ?? row.payload), ...patch },
              }))
            }
            jsonDraft={jsonDrafts[row.id] ?? ''}
            onJsonChange={(value) => setJsonDrafts((prev) => ({ ...prev, [row.id]: value }))}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => approve(row)}>
              {labels.approve}
            </Button>
            <Button size="sm" variant="outline" onClick={() => approve(row, true)}>
              {labels.reject}
            </Button>
            <Button size="sm" variant="outline" onClick={() => reextract(row.id)}>
              {labels.reextract}
            </Button>
          </div>
          {rowErrors[row.id] && <p className="mt-2 text-body text-danger">{rowErrors[row.id]}</p>}
        </Card>
      ))}
      {moreError && (
        <AdminLoadError error={moreError} labels={common.loadError} onRetry={loadMore} />
      )}
      {state.hasMore && !moreError && (
        <Button size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? common.loading : common.loadMore}
        </Button>
      )}
    </div>
  );
}

/** `transaction` → "Movimiento". Una entidad desconocida se muestra cruda, no se oculta. */
function nombreEntidad(entity: string, labels: Dictionary['admin']['stagingRows']): string {
  if (entity === 'transaction') return labels.entity.transaction;
  if (entity === 'invoice') return labels.entity.invoice;
  if (entity === 'bill') return labels.entity.bill;
  return entity;
}

/**
 * El motivo del marcado, en lenguaje claro.
 *
 * Va con fondo y borde de advertencia —texto+bg+borde juntos, como manda el design
 * guide— porque es la primera pregunta que se hace el analista al abrir la card: no
 * "qué dice esta fila" sino "por qué está acá".
 */
function MotivoDelMarcado({
  flagReason,
  labels,
}: {
  flagReason: string | null;
  labels: Dictionary['admin']['stagingRows'];
}) {
  const parsed = parseFlagReason(flagReason);
  if (!parsed) return null;

  return (
    <div className="mt-2 rounded-md border border-warning-bd bg-warning-bg px-2.5 py-2">
      <p className="font-mono text-eyebrow uppercase text-warning">{labels.reasonEyebrow}</p>
      <p className="mt-0.5 text-body text-foreground">{textoMotivo(parsed, labels)}</p>
    </div>
  );
}

function textoMotivo(parsed: ParsedFlagReason, labels: Dictionary['admin']['stagingRows']): string {
  const r = labels.reason;

  // Código que el backend emite y este frontend todavía no conoce: se dice eso y se
  // muestra el crudo. Callarlo dejaría al analista sin saber por qué está mirando la fila.
  if (parsed.code === null) return `${r.unknown} ${parsed.raw}`;

  if (parsed.code === 'low_confidence') {
    if (parsed.confidence === undefined) return r.low_confidence;
    // `formatPct` centraliza el formato de porcentaje (CLAUDE.md: nunca `Intl.*` inline).
    // Recibe la fracción TAL CUAL (0–1) y multiplica por 100 él mismo — es
    // `Intl.NumberFormat` con `style: 'percent'`. Pasarle `confidence * 100` mostraría
    // "3.000,0 %". Sin decimales: "confianza 30 %" es lo que el analista necesita saber,
    // el 30,0 solo agrega ruido.
    const detalle = r.lowConfidenceDetail.replace(
      '{value}',
      formatPct(parsed.confidence, undefined, 0),
    );
    return `${r.low_confidence} ${detalle}`;
  }

  if (parsed.code === 'missing_fx_rate') {
    return r.missing_fx_rate
      .replace('{currency}', parsed.quoteCurrency ?? '—')
      .replace('{date}', parsed.date ?? '—');
  }

  return r[parsed.code];
}
