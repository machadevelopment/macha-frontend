import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * CU-868khvzqn / CU-868kj0tdq: unidad de cada regla de alerta, en un solo lugar.
 *
 * Este mapa vivía dentro de `components/alerts/alert-detail.tsx`. Lo necesitan hoy tres
 * pantallas — el detalle de alerta, el histórico (`/alerts`) y los umbrales editables
 * del backoffice — así que se extrae en vez de copiarse: un mapa duplicado se
 * desincroniza en silencio y el síntoma es un número con la unidad equivocada, que es
 * exactamente el bug que se está arreglando.
 *
 * Es el espejo de `config/alert-catalog.ts` en macha-backend. El backend manda `ruleKey`
 * (estable) y NUNCA el label ni la unidad: el catálogo del backend solo tiene textos en
 * español, y la UI es ES/EN. Si allá se agrega una regla, se agrega aquí y en el
 * diccionario — el tipo `RuleKey` sale de `Dictionary`, así que TypeScript obliga a que
 * este mapa cubra exactamente las mismas claves que las etiquetas traducidas.
 */
export type RuleKey = keyof Dictionary['alerts']['rule'];

export type RuleUnit = 'days' | 'percent';

/**
 * `ar_overdue` se mide en días de vencimiento; las otras cinco son porcentajes. Sin
 * esto, un umbral de `30` (días) y uno de `35` (por ciento) se ven idénticos — y en el
 * backoffice son campos editables, así que la ambigüedad no es solo de lectura: un
 * operador puede meter un porcentaje donde van días.
 */
export const RULE_UNIT: Record<RuleKey, RuleUnit> = {
  ar_overdue: 'days',
  portfolio_concentration: 'percent',
  revenue_drop: 'percent',
  margin_drop: 'percent',
  spend_out_of_range: 'percent',
  low_credit_balance: 'percent',
};

/**
 * `ruleKey` llega como `string` desde la API (el backend no lo estrecha a un union), así
 * que hay que verificarlo antes de indexar. Una regla desconocida —una que exista en el
 * catálogo del backend pero todavía no aquí— se degrada a mostrar la clave cruda sin
 * unidad, nunca a romper la pantalla.
 */
export function isKnownRule(key: string): key is RuleKey {
  return key in RULE_UNIT;
}

/**
 * Etiquetas de unidad para `/admin/*`, que es español-only por decisión vigente: los
 * ocho paneles del backoffice tienen su texto en español directo en el JSX y solo lo
 * consumen operadores de Macha (ver criterio 5 del ticket). El producto del cliente NO
 * usa esto — ahí la unidad sale del diccionario i18n (`t.alerts.unit`), que es lo que
 * hacen `alert-detail.tsx` y `alert-list.tsx`.
 *
 * Cuando el backoffice se internacionalice, esta constante se borra y esas pantallas
 * pasan a leer del diccionario como el resto. El mapa de unidades de arriba se queda:
 * eso es dato, no texto.
 */
export const RULE_UNIT_LABEL_ES: Record<RuleUnit, string> = {
  days: 'días',
  percent: '%',
};
