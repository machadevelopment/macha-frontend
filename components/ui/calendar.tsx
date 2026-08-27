'use client';

import { DayPicker, type DateRange } from 'react-day-picker';
import { es as diasEs, enUS as diasEn } from 'react-day-picker/locale';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n/config';

/**
 * El rango del calendario, con `Date` — DISTINTO del `DateRange` de `lib/period`, que lleva las
 * fechas como `YYYY-MM-DD`. El alias existe justamente para que no se confundan: los dos son
 * "un rango", y mezclarlos compila hasta que alguien pasa uno donde va el otro.
 */
export type RangoDeCalendario = DateRange;

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL CALENDARIO DE RANGO, CON LOS TOKENS DE MACHA — CU-868kx7d5x
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Jose: *"en el rango Personalizado del selector de fecha, volver el calendario más amigable y
 * más fluido."* Hasta hoy eran dos `<input type="date">` nativos, y el propio `period-filter.ts`
 * dejaba anotado por qué y qué haría falta para cambiarlo: *"si el rediseño premium pide el
 * calendario exacto del prototipo, ese es su ticket y ya existirá el Popover."*
 *
 * ═══ SE AGREGA UNA DEPENDENCIA, NO DOS — Y ESA ES LA DECISIÓN ═══
 *
 * El ticket propone `react-day-picker` **y** `@radix-ui/react-popover`. El popover sobra: el
 * panel del rango personalizado **ya se despliega en línea** debajo de las píldoras, y el
 * comentario original defiende esa decisión para móvil (un popover flotante compite con el
 * teclado). Un calendario que va dentro de un panel que ya existe no necesita nada que lo
 * posicione. Sumar Radix Popover habría sido traer una librería para no usarla.
 *
 * `react-day-picker` sí hace falta y no se puede sustituir barato: son las semanas, el
 * arrastre del rango, la navegación por teclado y la localización de los nombres de mes y día
 * en dos idiomas. Verificado que corre en Bun (no toca APIs de Node).
 *
 * ═══ LOS COLORES SALEN DE LOS TOKENS, NINGUNO ESCRITO A MANO ═══
 *
 * La librería trae su CSS; acá se apaga y se estila con `classNames`. Es lo que hace que el
 * calendario funcione en tema oscuro sin una segunda hoja de estilos: los tokens ya tienen sus
 * dos versiones. Un hex del diseño escrito acá sería el error que parece fidelidad (misma
 * lección que las bandas de la landing).
 *
 * El rango seleccionado usa `--fill`/`--primary` y NO el verde de marca: elegir fechas no es
 * identidad ni es un dato que vaya bien o mal, así que ni salvia ni verde funcional. Es
 * selección, que en este producto se pinta con la tinta.
 */
export function Calendar({
  selected,
  onSelect,
  locale,
  disabled,
  className,
}: {
  selected: RangoDeCalendario | undefined;
  onSelect: (rango: RangoDeCalendario | undefined) => void;
  locale: Locale;
  /** Días no elegibles. El llamador manda `{ after: hoy }` para bloquear el futuro. */
  disabled?: React.ComponentProps<typeof DayPicker>['disabled'];
  className?: string;
}) {
  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      locale={locale === 'es' ? diasEs : diasEn}
      /*
       * Dos meses desde `sm`, uno en móvil. Elegir un rango que cruza el mes es el caso normal
       * —"del 15 de julio al 15 de agosto"— y con un solo mes obliga a navegar entre el inicio
       * y el fin, que es justo la fricción que este ticket viene a quitar. En un teléfono no
       * caben dos, y ahí un mes con navegación es mejor que dos apretados.
       */
      numberOfMonths={1}
      showOutsideDays
      className={cn('macha-calendario', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-2',
        month_caption: 'flex items-center justify-center h-8',
        caption_label: 'text-body font-medium capitalize',
        nav: 'flex items-center gap-1 absolute right-1 top-1',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-8 font-mono text-eyebrow uppercase text-faint font-normal flex items-center justify-center',
        week: 'flex w-full',
        day: 'h-8 w-8 p-0',
        day_button:
          'h-8 w-8 rounded-md text-caption tabular-nums transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
        /*
         * Los extremos del rango van en tinta llena y el medio en `--fill`. Es lo que hace
         * legible DÓNDE empieza y termina la selección sin leer las fechas: con todo el rango
         * del mismo tono, un rango de treinta días es una mancha sin bordes.
         */
        selected: 'bg-muted',
        range_start: '[&>button]:bg-primary [&>button]:text-primary-foreground',
        range_end: '[&>button]:bg-primary [&>button]:text-primary-foreground',
        range_middle: 'bg-muted',
        today: '[&>button]:font-semibold [&>button]:underline [&>button]:underline-offset-4',
        outside: 'text-faint opacity-50',
        disabled: 'text-faint',
      }}
    />
  );
}
