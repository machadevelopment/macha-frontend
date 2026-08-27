'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { request, requestJson, errorMessage } from '@/lib/api/browser';
import { formatDate, formatMoney } from '@/lib/format';
import type { CuentaAbierta } from '@/app/api/receivables/[cara]/route';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * LAS CUENTAS UNA POR UNA, Y PODER DARLAS POR SALDADAS — CU-868kx4cr6
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Jose: *"en Cuentas por Cobrar, analizar el estatus de la cuenta; si ya está pagada, se
 * debería restar del balance abierto. Actualmente sale el capital completo de las cuentas
 * aunque ya están pagadas."*
 *
 * Faltaban las dos mitades. El backend no tenía **nada** que escribiera `paid` —la columna
 * existía y nadie la tocaba nunca—, y esta pantalla no mostraba cuentas: solo totales por tramo
 * de mora y por contraparte. No se puede marcar como pagado lo que no aparece.
 *
 * ═══ SE MUESTRAN LAS PAGADAS TAMBIÉN, Y ESO NO ES RELLENO ═══
 *
 * Una lista que solo trajera las abiertas haría desaparecer la fila en cuanto se marca, y
 * entonces deshacer un error sería imposible desde acá: habría que buscarla en un sitio que no
 * existe. Quedan en la lista, apagadas y con su acción inversa.
 *
 * ═══ LA LISTA SE RECARGA DESDE EL SERVIDOR DESPUÉS DE CADA CAMBIO ═══
 *
 * Y no se parchea en memoria, que sería más rápido de escribir. El motivo es que el aging de
 * arriba —los tramos y la concentración— sale de OTRA llamada: parchear solo esta lista dejaría
 * los totales de la misma pantalla contradiciendo a la fila que el usuario acaba de tocar, que
 * es peor que esperar un instante. `onCambio` avisa al padre para que recargue lo suyo.
 */
export function CuentasAbiertas({
  cara,
  moneda,
  locale,
  labels,
  puedeSaldar,
  onCambio,
}: {
  /** `ar` = por cobrar, `ap` = por pagar. Misma tabla, semántica inversa. */
  cara: 'ar' | 'ap';
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics']['arAp'];
  /**
   * Si el rol puede cambiar el estado. Se pinta, NO se autoriza: la autoridad es
   * `settle_receivables` del backend, y esto solo evita ofrecer un botón que daría 403.
   */
  puedeSaldar: boolean;
  onCambio: () => void;
}) {
  const [filas, setFilas] = useState<CuentaAbierta[] | null>(null);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await request<{ rows: CuentaAbierta[] }>(`/api/receivables/${cara}`);
    // Si falla, la tarjeta no se pinta. Mismo criterio que `CurrencyNote`: es detalle sobre
    // las cifras de arriba, no las cifras, y una tarjeta en error ahí solo asusta.
    setFilas(res.ok ? res.data.rows : []);
  }, [cara]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiar(fila: CuentaAbierta) {
    setEnCurso(fila.id);
    const siguiente = fila.status === 'open' ? 'paid' : 'open';
    const res = await requestJson(`/api/receivables/${cara}/${fila.id}`, 'PATCH', {
      status: siguiente,
    });
    setEnCurso(null);
    if (!res.ok) {
      toast.error(errorMessage(res.error) ?? labels.openEmpty);
      return;
    }
    await cargar();
    onCambio();
  }

  if (!filas || filas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.openTitle}</CardTitle>
      </CardHeader>
      {/* La frase explica qué CAMBIA al marcar. Sin ella, el botón parece una etiqueta y no
          una acción que mueve la cifra de arriba. */}
      <p className="mt-1 text-caption text-muted-foreground">{labels.openHint}</p>

      <div className="mt-3 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.colCounterparty}</TableHead>
              <TableHead>{labels.colDue}</TableHead>
              <TableHead className="text-right">{labels.colAmount}</TableHead>
              <TableHead>{labels.colStatus}</TableHead>
              {puedeSaldar && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f) => {
              const pagada = f.status === 'paid';
              return (
                <TableRow key={f.id} className={pagada ? 'text-muted-foreground' : undefined}>
                  <TableCell className="font-medium">{f.counterparty}</TableCell>
                  <TableCell className="tabular-nums">
                    {f.dueDate ? formatDate(f.dueDate, locale) : labels.noDueDate}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {/*
                      El monto de una cuenta saldada va TACHADO además de apagado. El color solo
                      no alcanza —regla de los dos verdes, §1.3— y acá el canal redundante
                      importa más que de costumbre: la diferencia entre una cuenta que suma al
                      balance y una que no es exactamente lo que esta pantalla vino a mostrar.
                    */}
                    <span className={pagada ? 'line-through' : undefined}>
                      {formatMoney(f.amountBase, moneda, locale)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pagada ? 'success' : 'neutral'}>
                      {pagada ? labels.statusPaid : labels.statusOpen}
                    </Badge>
                  </TableCell>
                  {puedeSaldar && (
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={() => void cambiar(f)}
                        disabled={enCurso !== null}
                        className="text-caption text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                      >
                        {pagada ? labels.markOpen : labels.markPaid}
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
