// Shapes matching macha-backend's src/modules/metrics/index.ts and
// src/modules/insights/index.ts responses exactly.

export interface MonthlyMetric {
  period: string;
  revenue: number;
  cogs: number;
  opex: number;
  other: number;
  /**
   * CU-868kh8y58 — margen bruto: `revenue - cogs`, sin restar `opex`. Los dos campos
   * son las dos caras del MISMO dato y el backend los emite ya calculados justamente
   * para que la UI no los recomponga por su cuenta: el bug que originó el ticket era
   * que en la misma pantalla la ganancia restaba gastos y el margen no.
   */
  grossProfit: number;
  /** Porcentaje 0-100, o `null` en un período sin ventas (no existe margen, no es 0%). */
  grossMarginPct: number | null;
  /** @deprecated Alias de `grossProfit` que el backend mantiene una release para que el
   * orden de despliegue entre Vercel y Railway no importe. No usar en código nuevo. */
  margin: number;
}

export interface MetricsResponse {
  baseCurrency: string;
  months: MonthlyMetric[];
}

export type AgingBuckets = {
  current: number;
  '1_30': number;
  '31_60': number;
  '61_90': number;
  '90_plus': number;
};

export interface ArApResponse {
  baseCurrency: string;
  ar: AgingBuckets;
  ap: AgingBuckets;
}

export interface CreditsBalanceResponse {
  balance: number;
}

/**
 * Categoría de un consejo. Son los CÓDIGOS que manda el backend, no etiquetas: la
 * traducción a ES/EN vive en el diccionario, igual que con `ruleKey` de las alertas.
 */
export type InsightCategory = 'collections' | 'sales' | 'financial';

export interface InsightResponse {
  /**
   * Los consejos ya separados y clasificados por el modelo. Puede venir VACÍO si el modelo
   * respondió en prosa en vez de llamar a la herramienta; en ese caso `narrative` trae el
   * texto y la pantalla degrada a mostrarlo sin categorías.
   */
  insights: Array<{ category: InsightCategory; text: string }>;
  narrative: string;
  creditBalance: number;
}

export interface InsufficientCreditsResponse {
  error: 'insufficient_credits';
  required: number;
  balance: number;
}

/** Totales de un rango arbitrario + la ventana anterior del mismo tamaño (backend
 * `GET /metrics/period`). Alimenta el filtro de período del dashboard. */
export interface PeriodTotals {
  revenue: number;
  cogs: number;
  opex: number;
  other: number;
}

export interface PeriodPoint extends PeriodTotals {
  date: string;
}

export interface PeriodMetricsResponse {
  baseCurrency: string;
  from: string;
  to: string;
  current: PeriodTotals;
  /** Mismo tamaño de ventana, justo antes. Es contra esto que se calcula cada delta. */
  previous: PeriodTotals;
  series: PeriodPoint[];
}

/** `GET /metrics/products` — desempeño por producto en un rango. */
export interface ProductRevenue {
  productId: string;
  name: string;
  /** Familia comercial; `null` mientras la ingesta no la haya podido deducir. */
  category: string | null;
  revenue: number;
  cogs: number;
  /** CU-868kh8y58: utilidad bruta = ingreso − costo directo. Viene calculada del backend
   *  por la misma razón que en `MonthlyMetric`: para que la UI no la recomponga distinto. */
  grossProfit: number;
  /** 0-100, o `null` en un producto sin ventas en el rango. */
  grossMarginPct: number | null;
  /**
   * Unidades vendidas, o `null` si NINGUNA fila de venta del producto trajo cantidad.
   *
   * `null` y 0 significan cosas distintas y la UI tiene que distinguirlas: muchos libros
   * de PYME no traen columna de unidades, y mostrar "0 unidades" en un producto que
   * facturó miles es sencillamente falso. Donde no se sabe, se dice que no se sabe.
   */
  units: number | null;
  /** Ingreso solo de las filas que traen unidades — el denominador honesto del ticket
   *  promedio. Ver la nota del backend en `modules/metrics/products.ts`. */
  revenueWithUnits: number;
  transactionCount: number;
  revenueSharePct: number;
  previousRevenue: number;
  trend: 'up' | 'down' | 'flat';
}

export interface ProductRevenueResponse {
  baseCurrency: string;
  /** Vacío cuando ninguna transacción del rango tiene producto asociado — lo normal en
   * documentos ingeridos antes de que la IA extrajera el campo. NO es "no hubo ventas". */
  items: ProductRevenue[];
}

/** `GET /metrics/categories` — desglose por categoría CONTABLE (el movimiento), que no es
 *  lo mismo que `ProductRevenue.category` (la familia comercial del producto). */
export interface CategoryBreakdownRow {
  category: string;
  type: 'revenue' | 'cogs' | 'opex' | 'other';
  total: number;
  transactionCount: number;
  /** Participación dentro de su propio `type`, no del total general: ese total mezcla
   *  ingreso con costo y un porcentaje sobre él no significa nada. */
  sharePct: number;
}

export interface CategoryBreakdownResponse {
  baseCurrency: string;
  rows: CategoryBreakdownRow[];
}

/** `GET /inventory` — existencias por SKU. */
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  productId: string | null;
  productName: string | null;
  location: string | null;
  quantityOnHand: number;
  reorderPoint: number;
  unitCostOriginal: number;
  unitCostCurrency: string;
  unitCostBase: number;
  /** Existencia × costo unitario, en moneda base. Lo calcula el backend para que el valor
   *  del inventario sea el mismo número en pantalla, en un reporte y en el chat. */
  stockValueBase: number;
  supplier: string | null;
  lastRestockDate: string | null;
  belowReorderPoint: boolean;
}

export interface InventoryResponse {
  baseCurrency: string;
  items: InventoryItem[];
  totalStockValueBase: number;
  belowReorderCount: number;
}

export type MovementType = 'in' | 'out' | 'adjustment';

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  movementType: MovementType;
  quantity: number;
  /** Existencia resultante tras el movimiento: deja leer el historial sin re-sumarlo. */
  quantityAfter: number;
  reason: string | null;
  occurredAt: string;
}

export interface InventoryMovementsResponse {
  movements: InventoryMovement[];
}
