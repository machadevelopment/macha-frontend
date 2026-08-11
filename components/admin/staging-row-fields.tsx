'use client';

import { Textarea } from '@/components/ui/textarea';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * La fila marcada, como FICHA DE CAMPOS EDITABLES en vez de JSON crudo (ronda de QA
 * 2026-08-11).
 *
 * Antes esto era `JSON.stringify(payload, null, 2)` dentro de un `<textarea>`: llaves,
 * comillas, comas y claves en inglés camelCase (`originalAmount`, `originalCurrency`). El
 * analista leía `"date": "2023-04-15"` en vez de `Fecha: 2023-04-15`, y para corregir un
 * monto tenía que editar JSON sin romper la sintaxis — con un `invalidJson` esperándolo si
 * se comía una coma. El trabajo de esta bandeja es de sentido común, no técnico.
 *
 * LOS CAMPOS SON LOS DEL EXTRACTOR, no una lista inventada: salen de
 * `TRANSACTION_PAYLOAD_SCHEMA` e `INVOICE_LIKE_PAYLOAD_SCHEMA` en
 * `macha-backend/src/lib/anthropic.ts`, que es quien produce estos payloads.
 *
 * TRES COSAS QUE HAY QUE CUIDAR AL EDITAR ESTO:
 *
 * 1. **Las claves que no se conocen NO se pierden.** El payload se reconstruye sobre el
 *    original (`{ ...payload, ...cambios }`), así que un campo que el extractor agregue
 *    mañana viaja intacto al `PATCH` aunque esta ficha no lo pinte. Si se armara desde
 *    cero, aprobar una fila la mutilaría en silencio.
 *
 * 2. **`quantity` distingue `null` de `0`.** Cero unidades vendidas y "esta fila no habla
 *    de unidades" (un alquiler, un total) son cosas distintas, y sobre la segunda no se
 *    puede promediar — es la misma razón por la que el esquema del backend lo declara
 *    `number|null` y no con default 0. Un campo vacío escribe `null`, nunca `0`.
 *
 * 3. **Los valores se escriben con el TIPO correcto.** `originalAmount` y `quantity` van
 *    como número, no como string: la promoción a `transactions`/`invoices` los espera así.
 *    Un `"1500"` con comillas es un dato roto que el JSON crudo permitía escribir.
 */

/** Un campo del payload, con el control que le corresponde por tipo. */
type CampoTipo = 'text' | 'longtext' | 'date' | 'number' | 'select';

interface Campo {
  clave: string;
  etiqueta: string;
  tipo: CampoTipo;
  opciones?: Array<{ valor: string; etiqueta: string }>;
}

export type Payload = Record<string, unknown>;

function camposDe(
  targetEntity: string,
  labels: Dictionary['admin']['stagingRows'],
): Campo[] | null {
  const f = labels.field;

  if (targetEntity === 'transaction') {
    return [
      {
        clave: 'type',
        etiqueta: f.type,
        tipo: 'select',
        opciones: [
          { valor: 'revenue', etiqueta: labels.txType.revenue },
          { valor: 'cogs', etiqueta: labels.txType.cogs },
          { valor: 'opex', etiqueta: labels.txType.opex },
          { valor: 'other', etiqueta: labels.txType.other },
        ],
      },
      { clave: 'category', etiqueta: f.category, tipo: 'text' },
      { clave: 'date', etiqueta: f.date, tipo: 'date' },
      { clave: 'description', etiqueta: f.description, tipo: 'longtext' },
      { clave: 'originalAmount', etiqueta: f.amount, tipo: 'number' },
      { clave: 'originalCurrency', etiqueta: f.currency, tipo: 'select', opciones: MONEDAS },
      { clave: 'product', etiqueta: f.product, tipo: 'text' },
      { clave: 'quantity', etiqueta: f.quantity, tipo: 'number' },
      { clave: 'productCategory', etiqueta: f.productCategory, tipo: 'text' },
    ];
  }

  if (targetEntity === 'invoice' || targetEntity === 'bill') {
    return [
      { clave: 'counterparty', etiqueta: f.counterparty, tipo: 'text' },
      { clave: 'issueDate', etiqueta: f.issueDate, tipo: 'date' },
      { clave: 'dueDate', etiqueta: f.dueDate, tipo: 'date' },
      { clave: 'originalAmount', etiqueta: f.amount, tipo: 'number' },
      { clave: 'originalCurrency', etiqueta: f.currency, tipo: 'select', opciones: MONEDAS },
    ];
  }

  // Entidad que este frontend no conoce: se devuelve `null` y el llamador cae al editor
  // JSON de respaldo. Degradar es mejor que pintar una ficha vacía sobre datos reales.
  return null;
}

/** GTQ y USD son las dos únicas monedas que el extractor y `staging-rules.ts` admiten. */
const MONEDAS = [
  { valor: 'GTQ', etiqueta: 'GTQ' },
  { valor: 'USD', etiqueta: 'USD' },
];

/** El valor como texto para el input. `null`/`undefined` → cadena vacía, no "null". */
function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

export function StagingRowFields({
  targetEntity,
  payload,
  labels,
  onChange,
  jsonDraft,
  onJsonChange,
}: {
  targetEntity: string;
  payload: Payload;
  labels: Dictionary['admin']['stagingRows'];
  onChange: (patch: Payload) => void;
  /** Respaldo para entidades desconocidas; solo entonces se usa. */
  jsonDraft: string;
  onJsonChange: (value: string) => void;
}) {
  const campos = camposDe(targetEntity, labels);

  if (!campos) {
    return (
      <Textarea
        rows={6}
        className="mt-2 font-mono text-body"
        value={jsonDraft}
        onChange={(e) => onJsonChange(e.target.value)}
      />
    );
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {campos.map((campo) => {
        const id = `${campo.clave}-field`;
        const valor = aTexto(payload[campo.clave]);
        const comun =
          'rounded-md border border-input bg-background px-2 py-1.5 text-body ' +
          (campo.tipo === 'number' || campo.tipo === 'date' ? 'tabular-nums' : '');

        return (
          <label key={campo.clave} className="flex flex-col gap-1">
            <span className="font-mono text-eyebrow uppercase text-faint">{campo.etiqueta}</span>

            {campo.tipo === 'select' && (
              <select
                id={id}
                value={valor}
                onChange={(e) => onChange({ [campo.clave]: e.target.value })}
                className={comun}
              >
                {/*
                  La opción vacía existe porque una fila marcada por `invalid_type` o
                  `invalid_currency` llega justamente con un valor que NO está en la lista.
                  Sin ella el `<select>` mostraría la primera opción y le mentiría al
                  operador diciéndole que el dato ya está bien.
                */}
                <option value="">{labels.empty_value}</option>
                {campo.opciones?.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
                {/* Valor fuera de catálogo: se muestra tal cual para que se vea QUÉ trajo. */}
                {valor !== '' && !campo.opciones?.some((o) => o.valor === valor) && (
                  <option value={valor}>{valor}</option>
                )}
              </select>
            )}

            {campo.tipo === 'longtext' && (
              <Textarea
                id={id}
                rows={2}
                className="text-body"
                value={valor}
                onChange={(e) => onChange({ [campo.clave]: e.target.value || null })}
              />
            )}

            {(campo.tipo === 'text' || campo.tipo === 'date' || campo.tipo === 'number') && (
              <input
                id={id}
                type={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' ? 'number' : 'text'}
                step={campo.tipo === 'number' ? 'any' : undefined}
                value={valor}
                onChange={(e) => onChange({ [campo.clave]: convertir(campo.tipo, e.target.value) })}
                className={comun}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

/**
 * Texto del input → valor con el tipo que espera la promoción.
 *
 * Un campo numérico vacío escribe `null` y no `0`: para `quantity` esa distinción es
 * semántica (ver la cabecera), y para `originalAmount` un `0` silencioso convertiría una
 * fila incompleta en una fila "válida" de monto cero, que es peor que dejarla marcada.
 *
 * Un número ilegible se deja pasar como el TEXTO tal cual en vez de convertirlo en `NaN`:
 * `NaN` no sobrevive a `JSON.stringify` (sale `null`) y el operador vería su cifra
 * desaparecer sin explicación. Así llega al backend, que la rechaza con su propia
 * validación.
 */
function convertir(tipo: CampoTipo, texto: string): unknown {
  if (tipo !== 'number') return texto === '' ? null : texto;
  if (texto.trim() === '') return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : texto;
}
