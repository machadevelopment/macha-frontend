// Shapes matching macha-backend's src/modules/billing/{register,credits-topup}.ts responses exactly.

export interface RegisterRequest {
  name: string;
  industry: string;
  baseCurrency: 'GTQ' | 'USD';
  locale: 'es' | 'en';
}

export interface RegisterResponse {
  companyId: string;
  /**
   * CU-868kmxu41: `null` cuando el entorno no tiene proveedor de pagos configurado y
   * el operador habilitó el registro sin checkout (`BILLING_CHECKOUT_OPTIONAL`). Es
   * `null` explícito y no cadena vacía: una URL vacía se confunde con una rota.
   */
  checkoutUrl: string | null;
}

export interface CreditsTopupRequest {
  credits: number;
}

export interface CreditsTopupResponse {
  checkoutUrl: string;
}
