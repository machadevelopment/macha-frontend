'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { AdminLoadError } from '@/components/admin/admin-load-error';
import { errorMessage, request, type RequestError } from '@/lib/api/browser';
import { formatDate } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Template {
  id: string;
  industry: string;
  name: string;
  currentVersionId: string | null;
}

interface Version {
  id: string;
  version: number;
  createdAt: string;
}

/**
 * Una plantilla .xlsx DESCARGABLE por industria (pedido de Jose, 2026-08-20).
 *
 * No confundir con `Version`, que es material de la IA (sinónimos + few-shot) y nunca la ve una
 * persona. Esto es el archivo que se le entrega al cliente que no tiene ningún Excel armado.
 */
interface Starter {
  id: string;
  industry: string;
  originalFilename: string;
  fileSizeBytes: number;
  notes: string | null;
  version: number;
  createdAt: string;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * SUBIR LA PLANTILLA DESCARGABLE DE UNA INDUSTRIA
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Jose (2026-08-20): que el equipo pueda cargar una plantilla por industria para el cliente que
 * no tiene un Excel armado.
 *
 * ═══ LO QUE ESTA PANTALLA TIENE QUE DEJAR CLARO ═══
 *
 * Que esto NO es lo mismo que las versiones de arriba. Las dos cosas se llaman "plantilla" y
 * viven en la misma tarjeta, y confundirlas tiene consecuencias en direcciones opuestas: subir
 * un .xlsx creyendo que mejora la clasificación de la IA no mejora nada, y editar sinónimos
 * creyendo que cambia lo que el cliente descarga tampoco.
 *
 * Por eso el bloque lleva su propio título y una línea que dice para quién es el archivo.
 *
 * ═══ NO HAY "BORRAR", Y NO ES UNA FUNCIÓN PENDIENTE ═══
 *
 * La tabla es append-only: subir una versión nueva reemplaza a la vigente y la anterior queda
 * en el historial. Es lo que permite volver atrás —subir de nuevo el archivo bueno— y lo que
 * evita dejar objetos huérfanos en S3. Un botón de borrar daría la ilusión de que se puede
 * deshacer, cuando lo que corresponde es publicar otra versión.
 */
function SubirPlantillaDescargable({
  industry,
  starters,
  labels,
  onSubido,
}: {
  industry: string;
  starters: Starter[];
  labels: Dictionary['admin']['industryTemplates'];
  onSubido: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nota, setNota] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vigente = starters[0];

  async function subir() {
    if (!archivo) return;
    setSubiendo(true);
    setError(null);

    const fd = new FormData();
    fd.append('file', archivo);
    if (nota.trim()) fd.append('notes', nota.trim());

    /*
     * `request` y NO `fetch` crudo: lo exige `lib/api/no-raw-fetch.test.ts` y acá el motivo
     * aplica igual que en el dropzone del cliente — `request` no lanza, clasifica el fallo
     * (red / servidor) y CONSERVA el cuerpo del backend, que es lo que hace falta: un
     * "Tipo no soportado: text/plain" le dice a quien acaba de elegir un archivo qué hacer
     * distinto, mientras un "algo falló" lo deja probando con el mismo archivo.
     */
    const result = await request<unknown>(
      `/api/admin/industry-templates/starters/${encodeURIComponent(industry)}`,
      { method: 'POST', body: fd },
    );
    setSubiendo(false);

    if (!result.ok) {
      setError(errorMessage(result.error) ?? labels.starterUploadError);
      return;
    }

    setArchivo(null);
    setNota('');
    onSubido();
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-col gap-0.5">
        <p className="font-mono text-eyebrow uppercase text-faint">{labels.starterEyebrow}</p>
        {/* Para QUIÉN es el archivo. Es la línea que separa esto del material de la IA. */}
        <p className="text-body text-muted-foreground">{labels.starterHint}</p>
      </div>

      {vigente ? (
        <p className="text-body tabular-nums">
          <span className="font-medium">{vigente.originalFilename}</span>{' '}
          <span className="text-faint">
            · v{vigente.version} · {Math.round(vigente.fileSizeBytes / 1024)} KB ·{' '}
            {formatDate(vigente.createdAt)}
          </span>
          {vigente.notes && <span className="text-faint"> · {vigente.notes}</span>}
        </p>
      ) : (
        /*
         * "Ninguna" NO es un problema, y el texto lo dice: sin archivo curado el cliente sigue
         * descargando una plantilla generada con las categorías de su industria. Sin esa
         * aclaración, un operador puede creer que la descarga del cliente está rota.
         */
        <p className="text-body text-faint">{labels.starterNone}</p>
      )}

      {error && <p className="text-body text-danger">{error}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-col gap-0.5">
          <span className="text-micro text-faint">{labels.starterFile}</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="text-body"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-micro text-faint">{labels.starterNotes}</span>
          <Input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={labels.starterNotesPlaceholder}
            maxLength={500}
          />
        </label>
        {/* Apagado sin archivo: un botón activo que no hace nada se lee como pantalla rota. */}
        <Button size="sm" disabled={!archivo || subiendo} onClick={() => void subir()}>
          {subiendo ? labels.starterUploading : labels.starterUpload}
        </Button>
      </div>
    </div>
  );
}

export function IndustryTemplatesPanel({
  labels,
  common,
}: {
  labels: Dictionary['admin']['industryTemplates'];
  common: Dictionary['admin']['common'];
}) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  /**
   * Plantillas descargables, agrupadas por industria y con la vigente primero.
   *
   * Se piden TODAS en una sola llamada y se agrupan acá, en vez de una por industria: son
   * decenas de filas en total y una petición por tarjeta multiplicaría el tráfico por la
   * cantidad de industrias para traer lo mismo.
   */
  const [starters, setStarters] = useState<Record<string, Starter[]>>({});

  const [loadError, setLoadError] = useState<RequestError | null>(null);

  // CU-868kkgb3c: dos niveles de fetch anidados y ninguno protegido. Si fallaba el de
  // versiones, la plantilla quedaba con la tabla vacía — indistinguible de una plantilla
  // recién creada y sin versiones.
  const cargarStarters = useCallback(() => {
    void request<Starter[]>('/api/admin/industry-templates/starters').then((r) => {
      if (!r.ok) return; // el fallo NO tumba el panel: el material de la IA sigue visible
      const porIndustria: Record<string, Starter[]> = {};
      for (const st of r.data) (porIndustria[st.industry] ??= []).push(st);
      // El backend ya las devuelve con la versión descendente; se preserva ese orden.
      setStarters(porIndustria);
    });
  }, []);

  useEffect(() => {
    cargarStarters();
  }, [cargarStarters]);

  useEffect(() => {
    void request<Template[]>('/api/admin/industry-templates').then((result) => {
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setTemplates(result.data);
      for (const t of result.data) {
        void request<Version[]>(`/api/admin/industry-templates/${t.id}/versions`).then((v) => {
          // El fallo de UNA plantilla no tumba el panel: se deja su tabla sin filas y el
          // resto sigue. Reintentar recarga la pantalla completa.
          if (v.ok) setVersions((prev) => ({ ...prev, [t.id]: v.data }));
        });
      }
    });
  }, []);

  if (loadError)
    return (
      <AdminLoadError
        error={loadError}
        labels={common.loadError}
        onRetry={() => location.reload()}
      />
    );
  if (!templates) return null;

  return (
    <div className="flex flex-col gap-3">
      {templates.map((t) => (
        <Card key={t.id}>
          <p className="text-cardh2">
            {t.name}{' '}
            <span className="font-mono text-eyebrow uppercase text-faint">({t.industry})</span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.colVersion}</TableHead>
                <TableHead>{labels.colCreated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions[t.id]?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="tabular-nums">
                    v{v.version} {v.id === t.currentVersionId && '(actual)'}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatDate(v.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/*
            La industria se toma de `t.industry` y NO del nombre de la plantilla: es la clave
            con la que el backend resuelve qué archivo servirle a una empresa, y `companies
            .industry` casa contra eso.

            NOTA de alcance: una industria SIN fila en `industry_templates` no aparece en este
            panel, así que hoy no se le puede subir plantilla descargable desde acá. La tabla
            del backend sí lo permite a propósito (la industria es texto libre). Queda dicho en
            vez de inventado: agregar un campo de industria libre es UI que Jose no pidió.
          */}
          <SubirPlantillaDescargable
            industry={t.industry}
            starters={starters[t.industry] ?? []}
            labels={labels}
            onSubido={cargarStarters}
          />
        </Card>
      ))}
    </div>
  );
}
