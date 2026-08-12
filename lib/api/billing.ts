// Shapes matching macha-backend's src/modules/billing/{register,credits-topup}.ts responses exactly.

export interface RegisterRequest {
  name: string;
  industry: string;
  baseCurrency: 'GTQ' | 'USD';
  locale: 'es' | 'en';
  /**
   * Ticket B4. Opcional en el backend —si no viene, toma el plan de entrada del catálogo—
   * y por eso opcional acá también: el contrato es del backend, no del formulario.
   */
  planCode?: string;
}

/** Plan del catálogo, tal como lo devuelve `GET /register/plans` (ticket B4). */
export interface RegisterPlan {
  code: string;
  name: string;
  amountUsdCents: number;
  monthlyCredits: number;
  sortOrder: number;
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
