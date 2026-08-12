'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ExternalLink, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShowcaseFrame, ShowcaseSeal } from '@/components/ui/showcase';
import { Textarea } from '@/components/ui/textarea';
import { LoadError } from '@/components/ui/load-error';
import { errorMessage, request, requestJson, type RequestError } from '@/lib/api/browser';
import { formatDate, formatMoney, formatPct } from '@/lib/format';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

type Frequency = keyof Dictionary['reports']['frequencyValue'];

interface ReportData {
  id: string;
  periodStart: string;
  periodEnd: string;
  /** CU-868khvzve: ya venía en la respuesta del backend (`reports.frequency`) y el
   * cliente no la declaraba, así que se descartaba en silencio. */
  frequency: string;
  version: number;
  narrative: string;
  /** CU-868kh8rz8: moneda base REAL de la empresa. `metrics` no la trae (son
   * amount_base ya convertidos), así que viaja aparte en la respuesta. */
  baseCurrency: string;
  /** CU-868kh8uau: id de la versión actual (`report_versions.id`), no el del reporte. */
  versionId: string;
  metrics: {
    revenue: number;
    cogs: number;
    /**
     * CU-868kh8y58 — opcionales a propósito, no por descuido: `report_versions.metrics`
     * es un jsonb append-only y las versiones emitidas antes de la decisión de margen
     * bruto no los tienen ni los van a tener nunca.
     */
    grossProfit?: number;
    grossMarginPct?: number | null;
    /** @deprecated Forma anterior; único campo presente en versiones ya emitidas. */
    margin: number;
    accountsReceivableOpen: number;
    accountsPayableOpen: number;
  };
}

export function ReportDetail({
  reportId,
  locale,
  labels,
  common,
}: {
  reportId: string;
  locale: Locale;
  labels: Dictionary['reports'];
  common: Dictionary['common'];
}) {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<RequestError | null>(null);
  /** Fallo al guardar: se muestra JUNTO al editor, que sigue abierto. */
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void request<ReportData>(`/api/reports/${reportId}`).then((result) => {
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setReport(result.data);
      setDraft(result.data.narrative);
    });
  }, [reportId]);

  /**
   * CU-868kkg9z5: esto NUNCA miraba `res.ok`.
   *
   * `fetch` solo rechaza si no hubo respuesta, así que un 403/409/429/500 seguía de
   * largo: se cerraba el editor —la señal universal de "guardado"— y el texto del
   * usuario desaparecía, reemplazado por la versión anterior que devolvía el GET. Sin
   * aviso y sin forma de recuperarlo: `draft` se perdía al desmontar.
   *
   * Es contenido financiero que después se firma y se distribuye. El daño no era el
   * error, era que el error se presentaba como éxito.
   *
   * Ahora, si algo falla, el editor SIGUE ABIERTO con el texto intacto. Nunca se
   * descarta `draft` sin haberlo persistido.
   */
  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const created = await requestJson(`/api/reports/${reportId}/versions`, 'POST', {
        narrative: draft,
      });
      if (!created.ok) {
        setSaveError(
          errorMessage(created.error) ??
            (created.error.kind === 'http' && created.error.status === 403
              ? common.loadError.forbidden
              : common.loadError.server),
        );
        return;
      }

      // El refetch también se comprueba: antes un fallo suyo metía `undefined` en
      // `setReport` y rompía el render de toda la pantalla.
      const updated = await request<ReportData>(`/api/reports/${reportId}`);
      if (!updated.ok) {
        // La versión SÍ se creó; lo que falló fue releerla. Cerrar el editor es correcto
        // —el trabajo está guardado— y se refleja el texto que se acaba de mandar.
        setReport((prev) => (prev ? { ...prev, narrative: draft } : prev));
        setEditing(false);
        return;
      }
      setReport(updated.data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function openRendered() {
    const result = await request<{ url: string }>(`/api/reports/${reportId}/view`);
    // CU-868kkg9z5: sin esto, un fallo dejaba `url` en `undefined` y se abría una
    // pestaña en blanco — que el usuario lee como "el reporte está vacío".
    if (!result.ok) {
      setSaveError(errorMessage(result.error) ?? common.loadError.server);
      return;
    }
    window.open(result.data.url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Descarga en PDF o Excel (ticket B2). Misma mecánica que `openRendered` y por la misma
   * razón: el backend NO devuelve el binario sino una URL prefirmada de S3, de vida corta.
   *
   * Se comparte el manejo de fallo con `openRendered`, incluido el motivo original de
   * CU-868kkg9z5: abrir `undefined` en una pestaña nueva le muestra al usuario una página
   * en blanco, que lee como "el reporte salió vacío" en vez de "no se pudo descargar".
   *
   * Un 404 acá tiene un significado propio y esperable: el reporte existe pero su
   * exportación todavía no — la generación es asíncrona. El texto del backend lo dice, y
   * `errorMessage` lo conserva.
   */
  async function download(format: 'pdf' | 'xlsx') {
    const result = await request<{ url: string }>(`/api/reports/${reportId}/export/${format}`);
    if (!result.ok) {
      setSaveError(errorMessage(result.error) ?? common.loadError.server);
      return;
    }
    window.open(result.data.url, '_blank', 'noopener,noreferrer');
  }

  // CU-868kh8uau: se manda `versionId` (el `report_versions.id` real), no `reportId`.
  // Antes iba el id del REPORTE en el campo que dice contener el de la VERSIÓN y, al no
  // haber FK, la referencia falsa se persistía en silencio. El backend ahora valida y
  // la FK compuesta de la migración 0011 lo hace imposible a nivel de base.
  async function askInChat() {
    if (!report) return;
    const result = await requestJson<{ id: string }>('/api/chats', 'POST', {
      title: `${labels.chatThreadTitle} ${report.periodStart}`,
      reportVersionId: report.versionId,
    });
    // CU-868kkg9z5: antes navegaba a `/chat?thread=undefined` cuando esto fallaba.
    if (!result.ok) {
      setSaveError(errorMessage(result.error) ?? common.loadError.server);
      return;
    }
    router.push(`/chat?thread=${result.data.id}`);
  }

  if (loadError) {
    return <LoadError error={loadError} labels={common.loadError} />;
  }
  if (!report) return null;
  const currency = report.baseCurrency as 'GTQ' | 'USD';
  const frequencyLabel = labels.frequencyValue[report.frequency as Frequency] ?? report.frequency;

  return (
    <div className="flex flex-col gap-4">
      {/* CU-868khvzve: la pantalla no decía de qué reporte era. El eyebrow y el título
          repetían los de la lista ("REPORTES / Reportes") y el único identificador
          visible era "v3": llegando por el deep-link del email —que es el camino
          normal— no había forma de saber qué se estaba leyendo. El período es la
          identidad del documento, así que es el título.

          CU-868knx0vh — LA CABECERA ES VITRINA, EL CUERPO NO (design guide §2.7). Un
          reporte se comparte: se abre desde un correo, se descarga en PDF, se le manda al
          contador o a un banco. Su encabezado es la cara de Macha delante de alguien que
          quizá no es usuario del producto, así que lleva marca al 100% — atmósfera del
          Insight Point, sello con el isotipo y la barra del degradado del Brand Book.

          Y SE CORTA ACÁ. `ShowcaseFrame` recorta la atmósfera dentro del panel: debajo
          vienen KPIs y cifras, y el salvia jamás va detrás de un dato (compite con el verde
          funcional de los deltas y hace dudar de a quién pertenece el color). Por eso el
          marco envuelve solo este bloque y no el `<div>` de toda la pantalla. */}
      <ShowcaseFrame className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-start gap-4 p-[var(--density-card-p)]">
          {/* Las barras del isotipo, tumbadas a filete vertical: el degradado de
              `bg-brand-bar` es vertical, así que en un elemento alto se lee como el asset y
              no como una raya de color. */}
          <span className="w-[3px] shrink-0 self-stretch rounded-sm bg-brand-bar" aria-hidden />

          <div className="min-w-0 flex-1">
            <h1 className="text-h1 tabular-nums">
              {formatDate(report.periodStart, locale)} — {formatDate(report.periodEnd, locale)}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {/* Chip NEUTRO y no de marca: la frecuencia es un atributo del documento, y un
                  chip salvia acá empezaría a calificar contenido. */}
              <Badge variant="neutral">{frequencyLabel}</Badge>
              <span className="font-mono text-eyebrow uppercase text-faint">
                {labels.baseCurrencyLabel}: {currency}
              </span>
            </div>
          </div>

          {/* El sello, no un logo suelto: es la firma de quien emite el documento. Se
              esconde en pantallas angostas para no robarle el ancho al período, que es la
              identidad del reporte. */}
          <span className="hidden sm:block">
            <ShowcaseSeal size="md" />
          </span>
        </div>
      </ShowcaseFrame>

      {!editing && saveError && <p className="text-body text-danger">{saveError}</p>}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openRendered}>
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.viewRendered}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={askInChat}>
          <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.askInChat}
        </Button>
        {/* Ticket B2. Van junto a "Ver versión final" porque son la misma acción vista de
            tres formas —abrir el reporte— y no una función aparte escondida en otro lado. */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void download('pdf')}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.downloadPdf}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void download('xlsx')}
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.downloadExcel}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.revenue}</p>
          <p className="mt-1 text-kpi tabular-nums">
            {formatMoney(report.metrics.revenue, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.cogs}</p>
          <p className="mt-1 text-kpi tabular-nums">
            {formatMoney(report.metrics.cogs, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.margin}</p>
          <p className="mt-1 text-kpi tabular-nums">
            {/* CU-868kh8y58: `report_versions.metrics` es un jsonb en un ledger
                append-only, así que las versiones emitidas ANTES de esta decisión
                conservan `margin` para siempre y no hay migración que las alcance.
                El `??` no es defensivo por si acaso: es la única forma de leer un
                reporte viejo. */}
            {formatMoney(report.metrics.grossProfit ?? report.metrics.margin, currency, locale)}
          </p>
          {report.metrics.grossMarginPct != null && (
            <p className="mt-0.5 text-body tabular-nums text-muted-foreground">
              {formatPct(report.metrics.grossMarginPct / 100, locale)}
            </p>
          )}
        </Card>
      </div>

      {/* CU-868khvzve criterio 3: `accountsReceivableOpen`/`accountsPayableOpen` ya
          venían en `metrics` y no se mostraban. Van en una fila aparte y no junto a los
          tres de arriba a propósito: ingresos/costo/margen son el resultado del período,
          estos dos son posición de liquidez al cierre — mezclarlos en una sola fila de
          cinco sugeriría que se leen igual. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.arOpen}</p>
          <p className="mt-1 text-kpi tabular-nums">
            {formatMoney(report.metrics.accountsReceivableOpen, currency, locale)}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-eyebrow uppercase text-faint">{labels.kpi.apOpen}</p>
          <p className="mt-1 text-kpi tabular-nums">
            {formatMoney(report.metrics.accountsPayableOpen, currency, locale)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="font-mono text-eyebrow uppercase text-faint">v{report.version}</p>
          {!editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {labels.edit}
            </Button>
          )}
        </div>
        {editing ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
            {/* CU-868kkg9z5: el error va acá, con el editor abierto y el texto puesto. */}
            {saveError && <p className="text-body text-danger">{saveError}</p>}
            <Button size="sm" onClick={save} disabled={saving} className="self-start">
              {saving ? labels.saving : labels.save}
            </Button>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-body">{report.narrative}</p>
        )}
      </Card>
    </div>
  );
}
