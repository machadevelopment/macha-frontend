import { Card } from '@/components/ui/card';
import { DeltaBadge } from '@/components/charts/delta-badge';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/cn';
import { Sparkline } from '@/components/charts/sparkline';

// design guide.md §5 "KPI card" (`.kpi`) — Tremor Raw was the spec, but F1 shipped
// @tremor/react instead (see CLAUDE.md "Known deviation"). Its own color system
// doesn't map onto our green/red/amber tokens, so this KPI card is built directly
// on our own Card/Badge primitives rather than Tremor's Metric/BadgeDelta — actual
// Recharts-backed charts (AreaChart/BarChart/DonutChart, F4) are where @tremor/react
// itself gets used.
export interface KpiCardProps {
  label: string;
  value: string;
  /** Fraction, not a percentage — e.g. 0.123 renders as "+12.3%" (formatPct). */
  delta?: number;
  /** For cost-type metrics where an increase is bad (e.g. cogs) — flips green/red. */
  invertDelta?: boolean;
  /**
   * CU-868kh8y58: segunda cifra del MISMO dato, no un dato distinto — el par
   * "utilidad bruta Q35,700 · margen bruto 35.7%". Va en mono y tabular como dato de apoyo
   * (ver la nota del render); la cifra GRANDE, en cambio, ya no usa mono.
   */
  secondary?: string;
  /**
   * CU-868kh8y58: explicación en lenguaje de dueño, no contable ("De cada Q100 de
   * venta, esto te queda antes de gastos fijos"). Es prosa, así que va en `font-ui`
   * — la regla mono aplica a cifras y eyebrows, no a una frase.
   */
  hint?: string;
  /**
   * Cifra exacta bajo el valor abreviado, siguiendo el prototipo: arriba "Q1.29M" para
   * leer de un vistazo, debajo "Q 1,290,000" para el número real. En un producto
   * financiero abreviar y NO ofrecer el exacto obliga a salir de la pantalla a
   * verificar; mostrarlo cuesta una línea.
   */
  exact?: string;
  /** Ícono a la derecha de la etiqueta, como en el prototipo. */
  icon?: React.ReactNode;
  /** Texto bajo el delta: "vs mes anterior". Sin esto un porcentaje no dice contra qué. */
  deltaCaption?: string;
  /**
   * Serie para el sparkline del prototipo "MVP Macha". Son los MISMOS valores mensuales
   * que ya devuelve `/api/metrics`, no un adorno: si no hay serie, no se dibuja nada en
   * vez de inventar una.
   */
  spark?: number[];
  locale?: Locale;
  /**
   * `compact` — CU-868ku91y9. La fila de Analítica, no la del Dashboard.
   *
   * El prototipo usa DOS tarjetas distintas y no una reciclada: el Dashboard lleva la
   * completa (cifra exacta, sparkline, hint) y Analítica una de tres líneas — etiqueta,
   * valor y variación. Acá había una sola, la grande, puesta en las dos pantallas: seis
   * líneas apiladas × seis tarjetas es lo que se lee como "demasiado grande".
   *
   * Es una PROP y no un componente nuevo a propósito: la escala de la cifra, la regla de
   * signo del delta y el manejo del valor faltante ya viven acá, y una copia de todo eso
   * para Analítica se desincroniza en el primer cambio — que es exactamente el error que
   * este ticket vino a corregir, en el otro sentido.
   *
   * Lo que oculta —`exact`, `hint`, `deltaCaption`, `spark`— NO se pierde: el dato exacto
   * está en las tablas de los seis tabs, que es donde el prototipo espera que se lea.
   */
  variant?: 'default' | 'compact';
  loading?: boolean;
  className?: string;
}

/**
 * Qué tan grande se pinta la cifra, según cuánto mide.
 *
 * ═══ POR QUÉ NO SE MIDE EL DOM ═══
 *
 * Lo exacto sería medir el ancho real con `ResizeObserver` y ajustar. No se hace, y no por
 * pereza: esta tarjeta se pinta en el servidor, así que la primera pintura saldría con el tamaño
 * equivocado y se reacomodaría al hidratar — un salto visible en la cifra principal del
 * dashboard, en cada carga. Un escalón por longitud de cadena es determinista, corre igual en
 * servidor y cliente, y no salta.
 *
 * Los cortes salen de la medición documentada en `tailwind.config.ts`: con el grid de 5 y el
 * rail del dashboard, la tarjeta más angosta da ~71px útiles. Se calibra contra lo que
 * `formatMoneyCompact` produce de verdad (`GTQ 1.1K` = 8, `GTQ 389.9K` = 10, `GTQ 1000M` = 9),
 * no contra longitudes hipotéticas.
 *
 * `truncate` sigue puesto en el elemento como última red — si algún día aparece una cadena más
 * larga que todo lo previsto, se recorta dentro de su tarjeta en vez de pintarse encima de la
 * vecina. Pero deja de ser el mecanismo normal, que era el problema.
 */
function escalaDeCifra(value: string): string {
  if (value.length <= 8) return 'text-kpi';
  if (value.length <= 11) return 'text-kpi-sm';
  return 'text-kpi-xs';
}

export function KpiCard({
  label,
  value,
  delta,
  invertDelta = false,
  secondary,
  hint,
  exact,
  icon,
  deltaCaption,
  spark,
  locale = 'es',
  variant = 'default',
  loading,
  className,
}: KpiCardProps) {
  const compacta = variant === 'compact';
  if (loading) {
    return (
      // El esqueleto sigue la misma variante: si cargara siempre con el alto de la grande,
      // la fila de Analítica daría un salto al llegar los datos.
      <Card className={cn('animate-pulse', variant === 'compact' && 'p-4', className)}>
        <div className="h-[10.5px] w-20 rounded bg-muted" />
        <div
          className={cn(
            'w-24 rounded bg-muted',
            variant === 'compact' ? 'mt-2 h-[22px]' : 'mt-3 h-[29px]',
          )}
        />
      </Card>
    );
  }

  return (
    // La elevación al pasar el cursor viene del prototipo. Con transform+transition de
    // CSS y no con framer-motion: es una dependencia entera para un desplazamiento de
    // 2px, y CLAUDE.md pide verificar compatibilidad con Bun antes de sumar librerías.
    //
    // CU-868kt8bg0: la duración y la curva ya NO se escriben acá. Eran `duration-200
    // ease-out`, que se parecía a la del prototipo sin serlo; ahora la curva exacta
    // (`cubic-bezier(0.2,0,0,1)` a 200 ms) es el DEFAULT de Tailwind en `tailwind.config`,
    // así que `transition-transform` a secas ya la trae — y la comparte con las otras
    // veinte transiciones del producto en vez de ser un ajuste suelto de esta tarjeta.
    /*
      CU-868ku9q7c: el `min-w-0` que hacía falta acá vive ahora en la primitiva `Card`
      (CU-868ku9rpy), porque el mismo defecto apareció en otras cuatro pantallas. La causa,
      para quien llegue a este archivo buscándola: la tarjeta es el hijo de grid y tiene
      `min-width: auto`, así que una cifra exacta larga en mono empujaba su min-content, esa
      columna se ensanchaba y las otras cuatro se apretaban — de ahí que las tarjetas de una
      misma fila midieran distinto.
    */
    <Card
      className={cn(
        'transition-transform hover:-translate-y-0.5',
        // `p-4` como el `card-surface p-4` del prototipo para esta fila.
        compacta && 'p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-eyebrow uppercase text-faint">{label}</p>
        {icon && <span className="shrink-0 text-faint">{icon}</span>}
      </div>
      {/*
        El valor manda y el sparkline va DEBAJO, no al lado.
        Antes eran hermanos en un flex con el sparkline en `shrink-0`, y con datos reales eso
        se rompía: de ~148px útiles el sparkline se llevaba 96 (80 + gap) y al número le
        quedaban 52 para escribir `GTQ 480,663.00`. No se recortaba — se DESBORDABA y se
        pintaba sobre la tarjeta vecina. Debajo, el número tiene todo el ancho y el sparkline
        se estira al que sobre (ver `Sparkline`, que ahora usa viewBox).

        `min-w-0` + `truncate` es el tope duro: aunque el número creciera hasta no caber, se
        recorta DENTRO de su tarjeta. Que un dato financiero se corte es malo; que se pinte
        encima del de al lado y los dos queden ilegibles es peor, y la cifra completa está una
        línea más abajo en `exact`.
      */}
      {/*
        En compacto el valor es fijo (`kpi-sm`, 20px ≈ el `text-lg` del prototipo) y NO pasa
        por `escalaDeCifra`: esa escala está calibrada contra el ancho de la tarjeta del
        dashboard con el rail de 348px al lado, y acá el grid es de seis columnas sin rail.
        Aplicarla escogería tamaños pensados para otra caja.
      */}
      <p
        className={cn(
          'mt-1 min-w-0 truncate tabular-nums',
          compacta ? 'text-kpi-sm' : escalaDeCifra(value),
        )}
      >
        {value}
      </p>
      {/*
        ═══ CU-868ktknbq · EL DATO DE APOYO BAJA A `micro` ═══

        Las cuatro líneas de abajo iban en `body` (14px/1.5). Medido contra el prototipo
        (`juanrodriguezbz/mvp-macha`, declarado fuente de verdad visual), esa era la única
        diferencia de escala real de esta tarjeta: la etiqueta, la cifra y el relleno ya
        coincidían. Tres líneas a 21px de alto contra 13px, más el delta encajonado en su
        propia fila, dejaban la tarjeta en ~258px contra los ~152px del prototipo — y con
        cinco KPIs eso es lo que empujaba la gráfica de tendencia abajo del pliegue.

        La cifra exacta y `secondary` van en MONO a propósito, y eso matiza la regla mono sin
        deshacerla: lo que se sacó del mono fue la CIFRA GRANDE (`text-kpi`), que es lo que
        hacía leer el producto como herramienta de desarrollador. Un dato denso de 10px
        alineado bajo ella es el caso donde el ancho fijo ayuda a leer, y es lo que hace el
        prototipo. El `hint` NO lleva mono: es prosa.
      */}
      {/*
        CU-868ku9q7c: estas dos ENVUELVEN, no se truncan, y la diferencia importa.

        El ticket proponía copiarles el `truncate` del valor grande. Sería repetir el error
        que CU-868ku6r48 acaba de arreglar: `truncate` sobre una cifra financiera no recorta,
        MIENTE — `GTQ 1,290,000.00` cortado en `GTQ 1,290,0` se lee como doce mil novecientos.
        Y acá el argumento del valor grande no aplica al revés: ahí truncar era aceptable
        PORQUE la cifra completa vive en esta línea. Si esta también se trunca, el número
        exacto no está en ninguna parte.

        Envolver es la degradación honesta: no se pierde un dígito, la tarjeta gana una línea
        y el grid ya estira las cinco a la misma altura, así que la fila no se descuadra.
        `break-words` cubre el caso sin espacios donde partir.
      */}
      {!compacta && exact !== undefined && (
        <p className="mt-1 min-w-0 break-words font-mono text-micro tabular-nums text-muted-foreground">
          {exact}
        </p>
      )}
      {!compacta && secondary !== undefined && (
        <p className="mt-0.5 min-w-0 break-words font-mono text-micro tabular-nums text-muted-foreground">
          {secondary}
        </p>
      )}
      {!compacta && spark && (
        <Sparkline data={spark} height={28} className="mt-2 w-full text-foreground" />
      )}
      {!compacta && hint !== undefined && (
        <p className="mt-1.5 font-ui text-micro text-faint">{hint}</p>
      )}
      {delta !== undefined && (
        <DeltaBadge
          value={delta}
          invert={invertDelta}
          locale={locale}
          /* Sin caja: acá la flecha es el canal redundante que pide la regla de color.
             Ver la nota de `DeltaBadge`. */
          presentation="inline"
          className={compacta ? 'mt-1' : 'mt-1.5'}
        />
      )}
      {!compacta && delta !== undefined && deltaCaption && (
        <p className="mt-0.5 font-ui text-micro text-faint">{deltaCaption}</p>
      )}
      {/*
        CU-868ku91y9: en compacto, una tarjeta SIN delta puede usar `deltaCaption` como su
        segunda línea. Es el hueco que el prototipo reserva para la variación, y dejarlo
        vacío en las tarjetas que no tienen delta —margen, cartera— las volvería a dejar
        más cortas que sus vecinas, que es el defecto que CU-868ku9q7c acaba de corregir en
        el dashboard. Acá lo ocupa el dato que sí hay: el margen neto.
      */}
      {compacta && delta === undefined && deltaCaption && (
        <p className="mt-1 font-mono text-micro tabular-nums text-muted-foreground">
          {deltaCaption}
        </p>
      )}
    </Card>
  );
}
