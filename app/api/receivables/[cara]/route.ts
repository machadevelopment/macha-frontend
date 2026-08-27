import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { apiFetch } from '@/lib/api/client';
import { activeCompanyId } from '@/lib/auth/active-company-server';

/**
 * Las cuentas por cobrar o por pagar, una por una — CU-868kx4cr6.
 *
 * Distinto de `/api/ar-ap`, que devuelve el aging AGREGADO: para poder dar por saldada una
 * cuenta hay que poder verla, y hasta este ticket la pantalla solo mostraba totales por tramo y
 * por contraparte. No se puede marcar como pagado lo que no aparece.
 */
export interface CuentaAbierta {
  id: string;
  counterparty: string;
  issueDate: string;
  dueDate: string | null;
  originalAmount: string;
  originalCurrency: 'GTQ' | 'USD';
  amountBase: number;
  status: 'open' | 'paid';
}

export async function GET(request: Request, { params }: { params: { cara: string } }) {
  const { accessToken, user } = await requireSession();
  const companyId = activeCompanyId(user.id);

  /*
   * El `status` se reenvía y lo valida el backend contra su unión. Repetir la validación acá
   * sería tener la misma regla en dos repos que no se despliegan a la vez.
   */
  const status = new URL(request.url).searchParams.get('status');
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';

  const data = await apiFetch<{ rows: CuentaAbierta[] }>(
    `/receivables/${encodeURIComponent(params.cara)}${qs}`,
    { accessToken, companyId },
  );
  return NextResponse.json(data);
}
