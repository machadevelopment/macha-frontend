'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { request, requestJson } from '@/lib/api/browser';
import { useResource } from '@/lib/api/use-resource';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { draftFor, editorFor, parseSettingDraft } from '@/components/admin/config-settings';

interface Setting {
  key: string;
  value: unknown;
  /** `null` cuando el parámetro todavía no tiene fila en la base: nadie lo editó nunca. */
  updatedAt: string | null;
  /**
   * Correo de quien lo cambió (ticket B7). `null` cuando la fila viene del seed o el staff
   * que la tocó ya no existe — el backend hace `leftJoin` a propósito para que esas filas
   * SIGAN apareciendo en vez de desaparecer del panel.
   */
  updatedByEmail: string | null;
  /**
   * De dónde sale el valor que se está mostrando (2026-08-20).
   *
   * `stored` — alguien lo decidió y vive en `platform_settings`.
   * `default` — es el valor de ARRANQUE del producto; no hay fila, y el sistema está usando
   *   este número igual porque cada lector pasa su propio fallback.
   *
   * La distinción es la razón por la que esta pantalla dejó de verse vacía. En producción la
   * tabla tiene 0 filas, así que el panel listaba nada mientras el sistema corría con cinco
   * parámetros en efecto: un panel de configuración que ocultaba la configuración vigente.
   */
  source: 'stored' | 'default';
}

/**
 * CU-868khw0ng: el panel se alimenta de lo que devuelva el backend
 * (`platform_settings` completa), así que cualquier parámetro sin entrada acá salía
 * con la key cruda por título. El diccionario cubre las keys conocidas; para las que
 * aparezcan después está el fallback `humanizeSettingKey`, que degrada a algo legible
 * en vez de a `intake_max_rows_per_file`. La key real siempre se muestra debajo del
 * label: es el identificador con el que se opera el backend.
 */
/**
 * CU-868kh8zvt: los textos salían de un mapa en español acá. Ahora vienen del
 * diccionario (`t.admin.config.settings`), con paridad ES/EN. Lo que NO se traduce es
 * la key (`credit_to_tokens_ratio`): es el identificador real con el que se opera el
 * backend y se sigue mostrando cruda bajo el label.
 *
 * `rows` no es texto y por eso se queda acá: el prompt de insight necesita un textarea
 * alto y eso no cambia con el idioma.
 */
const SETTINGS_ROWS: Record<string, number> = {
  insight_prompt_template: 14,
};

/** Fallback para keys sin entrada en SETTINGS_META: `rate_limit_ai_rpm` → `Rate limit ai rpm`. */
function humanizeSettingKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Un parámetro nuevo que resulte ser texto largo (otro prompt, por ejemplo) no debería
 * caer en un editor de una línea solo por no estar en el diccionario todavía.
 */
function rowsFor(key: string, draft: string): number {
  const explicit = SETTINGS_ROWS[key];
  if (explicit) return explicit;
  if (draft.includes('\n') || draft.length > 120) return 8;
  return 1;
}

/**
 * CU-B7-QA-20260811: `canEdit` lo resuelve la página server-side con
 * `getStaffTier()` — el mismo mecanismo con el que `app/admin/layout.tsx` gatea la
 * ruta entera. No se consulta ninguna capacidad desde el cliente ni se replica la
 * matriz de permisos: la autoridad sigue siendo `assertStaffCapability(tier,
 * 'edit_credits_to_tokens_param')` en macha-backend, que responde 403 aunque este
 * booleano llegue inflado.
 */
export function ConfigPanel({
  labels,
  common,
  canEdit,
}: {
  labels: Dictionary['admin']['config'];
  common: Dictionary['admin']['common'];
  canEdit: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  /** Error por key: cada parámetro se guarda por separado. */
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  const { state, reload } = useResource<Setting[]>(
    useCallback(async () => {
      const result = await request<Setting[]>('/api/admin/config');
      if (result.ok) {
        // La serialización valor→texto vive en `config-settings.ts` para poder
        // probarla: es la mitad del contrato de tipos con el jsonb del backend.
        setDrafts(Object.fromEntries(result.data.map((s) => [s.key, draftFor(s.value)])));
      }
      return result;
    }, []),
  );

  const settings = state.status === 'ready' ? state.data : null;

  /**
   * CU-868kkgb3c: esto no miraba `res.ok`, así que un PATCH rechazado se veía igual que
   * uno exitoso — el spinner paraba y el panel recargaba mostrando el valor VIEJO. Acá
   * se editan cosas como el ratio de tokens por crédito y el precio de venta: creer que
   * se guardó un cambio de precio que no se guardó es un problema de dinero.
   *
   * Además `JSON.parse` podía lanzar con un draft malformado y dejar el botón colgado en
   * "Guardando…" para siempre; ahora se valida antes de salir a la red.
   */
  async function save(key: string) {
    const original = settings?.find((s) => s.key === key);
    const parsed = parseSettingDraft(key, drafts[key] ?? '', original?.value);
    if (!parsed.ok) {
      // El mensaje se elige por el editor que el operador tiene enfrente: decirle
      // "no es JSON válido" a quien está en un campo numérico no le dice qué arreglar.
      setSaveErrors((prev) => ({
        ...prev,
        [key]: parsed.reason === 'number' ? labels.invalidNumber : labels.invalidJson,
      }));
      return;
    }
    const value = parsed.value;

    setSaving(key);
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const result = await requestJson(`/api/admin/config/${key}`, 'PATCH', { value });
      if (!result.ok) {
        setSaveErrors((prev) => ({
          ...prev,
          [key]: labels.saveError,
        }));
        return;
      }
      reload();
    } finally {
      setSaving(null);
    }
  }

  if (state.status === 'error')
    return <AdminLoadError error={state.error} labels={common.loadError} onRetry={reload} />;
  if (!settings) return null;

  return (
    <div className="flex flex-col gap-3">
      {/*
        CU-B7-QA-20260811: quien no es super_admin ve los valores pero no los controles.
        Los parámetros son información útil para cualquier staff (saber a qué ratio se
        debita, qué prompt se está mandando); lo que no puede es cambiarlos. Un
        formulario deshabilitado sería peor: invita a editar y luego no deja, y no
        explica por qué.
      */}
      {!canEdit && <p className="text-body text-muted-foreground">{labels.readOnlyNote}</p>}

      {settings.map((s) => {
        const meta = labels.settings[s.key];
        const draft = drafts[s.key] ?? '';
        const editor = editorFor(s.key, s.value);
        const title = meta?.label ?? humanizeSettingKey(s.key);
        return (
          <Card key={s.key}>
            {canEdit ? (
              <label htmlFor={`setting-${s.key}`} className="block text-cardh2">
                {title}
              </label>
            ) : (
              // Sin campo al que apuntar, un <label> es ruido para un lector de
              // pantalla: en modo lectura es un encabezado de tarjeta y nada más.
              <p className="text-cardh2">{title}</p>
            )}
            <p className="font-mono text-eyebrow uppercase text-faint">{s.key}</p>
            {meta && <p className="mt-1 text-body text-muted-foreground">{meta.description}</p>}

            {!canEdit ? (
              <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-body tabular-nums">
                {draft}
              </p>
            ) : editor === 'number' ? (
              /*
                Cifras (ratios, montos, topes) en un input numérico: el teclado móvil
                correcto, las flechas del navegador y un rechazo temprano de lo que no
                es un número, en vez de un textarea donde "1,200" se ve razonable y
                llega al backend como JSON inválido.
              */
              <Input
                id={`setting-${s.key}`}
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                className="mt-2 tabular-nums"
                value={draft}
                error={Boolean(saveErrors[s.key])}
                onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
              />
            ) : (
              <Textarea
                id={`setting-${s.key}`}
                rows={rowsFor(s.key, draft)}
                className="mt-2 font-mono text-body"
                value={draft}
                onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
              />
            )}

            {/*
              Un parámetro que nadie tocó se dice EXPLÍCITAMENTE, no se deja sin línea.
              "Sin línea" es indistinguible de un error de carga, y acá la información vale:
              este número está en efecto ahora mismo aunque no haya fila en la base.
            */}
            {s.source === 'default' && (
              <p className="mt-1 font-mono text-eyebrow uppercase text-faint">
                {labels.fromDefault}
              </p>
            )}

            {s.updatedAt && (
              /*
               * Ticket B7: además de CUÁNDO, ahora dice QUIÉN. En una pantalla donde se
               * edita el precio del crédito y la equivalencia crédito↔token, "cambió el 9
               * de agosto" sin autor es la mitad del dato: cuando un número está mal, lo
               * primero que se necesita saber es a quién preguntarle.
               *
               * Sin autor NO se escribe "por: —" ni se esconde la línea entera: se muestra
               * solo la fecha, que es exactamente lo que se sabe. Una fila sembrada por el
               * seed no tiene autor y eso no es un dato faltante, es que nadie la tocó.
               */
              <p className="mt-1 font-mono text-eyebrow uppercase text-faint">
                {labels.updatedAt} {formatDate(s.updatedAt)}
                {s.updatedByEmail && ` · ${labels.updatedBy} ${s.updatedByEmail}`}
              </p>
            )}
            {canEdit && (
              <Button
                size="sm"
                className="mt-2"
                onClick={() => save(s.key)}
                disabled={saving === s.key}
              >
                {saving === s.key ? common.saving : common.save}
              </Button>
            )}
            {/* CU-868kkgb3c: el error va por parámetro, junto a su propio botón. */}
            {saveErrors[s.key] && <p className="mt-1 text-body text-danger">{saveErrors[s.key]}</p>}
          </Card>
        );
      })}
    </div>
  );
}
