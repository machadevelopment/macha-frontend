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

export interface InsightResponse {
  narrative: string;
  creditBalance: number;
}

export interface InsufficientCreditsResponse {
  error: 'insufficient_credits';
  required: number;
  balance: number;
}
