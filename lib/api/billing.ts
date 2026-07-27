// Shapes matching macha-backend's src/modules/billing/{register,credits-topup}.ts responses exactly.

export interface RegisterRequest {
  name: string;
  industry: string;
  baseCurrency: 'GTQ' | 'USD';
  locale: 'es' | 'en';
}

export interface RegisterResponse {
  companyId: string;
  checkoutUrl: string;
}

export interface CreditsTopupRequest {
  credits: number;
}

export interface CreditsTopupResponse {
  checkoutUrl: string;
}
