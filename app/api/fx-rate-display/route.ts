import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * La tasa con la que una pantalla puede mostrarse en la otra moneda.
 *
 * Ruta aparte de `/api/fx-rate` porque son dos preguntas distintas: aquella devuelve el
 * catálogo COMPLETO para la pantalla de Ajustes (donde se administra), y esta devuelve UNA
 * tasa ya resuelta para una fecha. Colgar la resolución del catálogo en el cliente sería una
 * tercera implementación de una regla que el backend ya tiene documentada como "tiene que
 * coincidir o el producto se contradice consigo mismo" (`lib/fx.ts`).
 *
 * `rate: null` no es un error: es "esta empresa todavía no configuró su tipo de cambio", que
 * es el estado que dispara la mitad del flujo — la pantalla ofrece ir a configurarlo en vez
 * de convertir con un número inventado.
 */
export interface FxRateDisplayResponse {
  baseCurrency: 'GTQ' | 'USD';
  quoteCurrency: 'GTQ' | 'USD';
  /** Tal como se guarda: `quote → base`. Convertir DESDE la base es dividir (`lib/fx-display`). */
  rate: { rate: number; effectiveDate: string } | null;
}

export async function GET(request: Request) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);

  /*
   * `on` se reenvía tal cual y lo valida el backend contra su patrón de fecha. Validarlo acá
   * también sería tener la misma regla en dos lugares; lo único que hace este handler es
   * garantizar que el parámetro exista, porque sin él la llamada al backend sería un 400 que
   * el usuario vería como "no se pudo cargar" sin más.
   */
  const on = new URL(request.url).searchParams.get('on');
  if (!on) {
    return NextResponse.json({ error: 'Falta el parámetro "on".' }, { status: 400 });
  }

  const data = await apiFetch<FxRateDisplayResponse>(
    `/fx-rate/display?on=${encodeURIComponent(on)}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
