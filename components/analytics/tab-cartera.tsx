'use client';

import { CuentasAbiertas } from '@/components/analytics/cuentas-abiertas';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney, formatNumber, formatPct } from '@/lib/format';
import type { AgingBucket, AgingBuckets, CounterpartyConcentration } from '@/lib/api/dashboard';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Tabs de Cuentas por cobrar y por pagar — CU-868kt29t0.
 *
 * UN componente para los dos y no dos casi idénticos: son la misma pregunta con la
 * contraparte invertida (quién me debe / a quién le debo), y dos copias es como uno de los
 * dos lados acaba divergiendo sin que nada avise. Lo único que cambia es de qué lado de la
 * respuesta se leen los datos y qué dice el mensaje de vacío, que entran por props.
 *
 * ═══ POR QUÉ ESTE TAB NO RESPETA EL FILTRO DE PERÍODO ═══
 *
 * Y va dicho en pantalla, no solo acá: la cartera abierta es ESTADO VIVO. Una factura de
 * marzo que sigue sin cobrarse es plata que le deben hoy, aunque el filtro diga "este mes".
 * Filtrarla por el período la escondería justo cuando más importa — es la más vieja.
 *
 * Sin la leyenda, el usuario que cambia el filtro y ve las mismas cifras concluye que el
 * filtro está roto. La nota convierte una aparente falla en la explicación de una decisión.
 */

/** Orden de presentación: del más sano al más grave, que es como se lee una antigüedad. */
export const TRAMOS: AgingBucket[] = ['current', '1_30', '31_60', '61_90', '90_plus'];

/**
 * Semántica de color por tramo.
 *
 * `current` va NEUTRO y no verde: estar al día es lo normal, no un logro, y el verde
 * funcional se reserva para lo que de verdad señala una buena noticia. Los tres tramos de
 * mora escalan a `warning` y `danger` — y el chip lleva texto+fondo+borde, nunca solo color
 * (design guide §1 regla 3).
 */
export const VARIANTE: Record<AgingBucket, 'neutral' | 'warning' | 'danger'> = {
  current: 'neutral',
  '1_30': 'warning',
  '31_60': 'warning',
  '61_90': 'danger',
  '90_plus': 'danger',
};

export function TabCartera({
  buckets,
  concentracion,
  moneda,
  locale,
  labels,
  common,
  vacio,
  titulo,
  cara,
  role,
  onCambio,
}: {
  /** `null` si `/ar-ap` falló: su tarjeta queda marcada y el resto del tab sirve igual. */
  buckets: AgingBuckets | null;
  concentracion: CounterpartyConcentration | null;
  moneda: 'GTQ' | 'USD';
  locale: Locale;
  labels: Dictionary['analytics'];
  /**
   * CU-868kt2eh8: los rótulos de los tramos viven en `common`, no acá. Los usan también la
   * gráfica del dashboard, y dos juegos de etiquetas para lo mismo terminan diciendo
   * "1–30 días" en una pantalla y "1 a 30 días" en la otra.
   */
  common: Dictionary['common'];
  /** Mensaje de "no hay nada", distinto para cobrar y para pagar. */
  vacio: string;
  titulo: string;
  /** `ar` = por cobrar, `ap` = por pagar. La lista de cuentas necesita saber cuál pide. */
  cara: 'ar' | 'ap';
  /** Solo decide si se ofrece el botón de saldar; autoriza `settle_receivables` del backend. */
  role: string | null;
  /** El aging de arriba sale de otra llamada: al saldar una cuenta hay que recargarlo. */
  onCambio: () => void;
}) {
  const t = labels.arAp;
  const total = buckets ? TRAMOS.reduce((s, b) => s + buckets[b], 0) : 0;
  const vencido = buckets ? total - buckets.current : 0;
  const filas = concentracion?.top ?? [];

  if (buckets && total === 0 && filas.length === 0) {
    return (
      <Card>
        <p className="text-body text-muted-foreground">{vacio}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{`${titulo} · ${t.agingTitle}`}</CardTitle>
        </CardHeader>

        {/* La leyenda del período: sin ella, ver las mismas cifras al cambiar el filtro se
            lee como un filtro roto. Ver la nota de cabecera. */}
        <p className="mt-1 text-body text-faint">{labels.header.arOpenHint}</p>

        <p className="mt-3 font-mono text-eyebrow uppercase text-faint">{t.totalOpen}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-statbig tabular-nums">{formatMoney(total, moneda, locale)}</p>
          {vencido > 0 && (
            <Badge variant="danger">
              {`${t.overdueTotal}: ${formatMoney(vencido, moneda, locale)}`}
            </Badge>
          )}
        </div>

        {/* Barras de participación por tramo, no una gráfica: son cinco valores con nombre
            propio, y lo único que aporta la representación gráfica es el tamaño relativo. */}
        {buckets && (
          <ul className="mt-4 flex flex-col gap-3">
            {TRAMOS.map((b) => {
              const valor = buckets[b];
              const parte = total === 0 ? 0 : valor / total;
              return (
                <li key={b}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body">{common.agingBucket[b]}</span>
                    <span className="shrink-0 text-body tabular-nums">
                      {formatMoney(valor, moneda, locale)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {/* `aria-hidden` porque el porcentaje va en texto al lado: un lector de
                        pantalla que anunciara la barra leería el mismo dato dos veces. */}
                    <div
                      className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted"
                      aria-hidden="true"
                    >
                      <div
                        className={
                          VARIANTE[b] === 'danger'
                            ? 'h-full rounded-sm bg-danger'
                            : VARIANTE[b] === 'warning'
                              ? 'h-full rounded-sm bg-warning'
                              : 'h-full rounded-sm bg-foreground'
                        }
                        // Único estilo inline: es un ancho calculado por fila, no una clase
                        // que Tailwind pueda generar de antemano.
                        style={{ width: `${Math.min(100, Math.max(0, parte * 100))}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-body tabular-nums text-muted-foreground">
                      {formatPct(parte, locale)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.concentrationTitle}</CardTitle>
        </CardHeader>
        {filas.length === 0 ? (
          <p className="mt-3 text-body text-muted-foreground">{labels.empty}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colCounterparty}</TableHead>
                  <TableHead className="text-right">{labels.colTotal}</TableHead>
                  <TableHead className="text-right">{t.colOverdue}</TableHead>
                  <TableHead className="text-right">{t.colInvoices}</TableHead>
                  <TableHead>{t.colOldest}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.counterparty}>
                    <TableCell className="font-medium">{f.counterparty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(f.total, moneda, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {/* Cero en tinta apagada y no en rojo: no deber nada vencido no es una
                          alerta, y pintarlo igual que una mora real gasta la señal. */}
                      {f.overdue === 0 ? (
                        <span className="text-faint">{formatMoney(0, moneda, locale)}</span>
                      ) : (
                        <span className="text-danger">
                          {formatMoney(f.overdue, moneda, locale)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(f.invoiceCount, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANTE[f.worstBucket]}>
                        {common.agingBucket[f.worstBucket]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {/*
                  El renglón del resto: es lo que hace que la tabla SUME al total de arriba.
                  Sin él el usuario ve un top que no cuadra con el total abierto, y dos cifras
                  que no cuadran en la misma pantalla se leen como un error de cálculo aunque
                  las dos estén bien.
                */}
                {concentracion !== null && concentracion.resto.counterpartyCount > 0 && (
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      {t.rest.replace(
                        '{n}',
                        formatNumber(concentracion.resto.counterpartyCount, locale),
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(concentracion.resto.total, moneda, locale)}
                    </TableCell>
                    {/* El resto no trae vencido ni conteo de documentos desagregados: el
                        backend devuelve solo su total, porque desglosarlo sería el mismo
                        trabajo que no acotar la consulta. */}
                    <TableCell className="text-right text-faint">—</TableCell>
                    <TableCell className="text-right text-faint">—</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/*
        ═══ LAS CUENTAS UNA POR UNA, AL FINAL Y NO ARRIBA — CU-868kx4cr6 ═══

        El orden es deliberado: primero cuánto se debe y a quién (los agregados, que es la
        pregunta con la que se abre esta pantalla), después la lista donde se ACTÚA. Ponerla
        arriba obligaría a bajar para ver el total, que es lo primero que alguien mira.

        Se pinta sola si no hay cuentas, así que no agrega ruido a una empresa sin cartera.
      */}
      <CuentasAbiertas
        cara={cara}
        moneda={moneda}
        locale={locale}
        labels={t}
        puedeSaldar={role !== null}
        onCambio={onCambio}
      />
    </div>
  );
}
