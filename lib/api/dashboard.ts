// Shapes matching macha-backend's src/modules/metrics/index.ts and
// src/modules/insights/index.ts responses exactly.

export interface MonthlyMetric {
  period: string;
  revenue: number;
  cogs: number;
  opex: number;
  other: number;
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
