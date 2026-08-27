import type { Currency } from '@/lib/format';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * VER LAS CIFRAS EN LA OTRA MONEDA — LA LENTE, QUE NO ES LA CONTABILIDAD
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Pedido de Keneth (2026-08-26): *"si un user carga sus archivos en Q, pero quiere
 * visualizarlo convertido a USD, que le pida configurar el TC y tenga un botón para ver su
 * data en las 2 monedas."*
 *
 * ═══ POR QUÉ ESTO NO CONTRADICE LA DECISIÓN QUE LO PROHIBÍA ═══
 *
 * CU-868kj3gnv descartó por escrito el toggle de moneda, y su argumento sigue siendo correcto:
 * *"una fila que entró en quetzales tiene `fx_rate = 1`, o sea que NO existe una tasa congelada
 * que la exprese en dólares. Mostrar el dashboard entero en USD obligaría a inventarle una tasa
 * a esas filas."* Lo que a ese razonamiento le faltaba es que **inventar la tasa no era la
 * única alternativa**: se le puede PEDIR al dueño, que es justo el flujo de arriba. Una tasa
 * que el cliente configuró no es inventada — es la misma que ya mantiene para la ingesta.
 *
 * Lo que sí hay que conservar intacto es la distinción que aquella nota protege:
 *
 *   · `amount_base` es CONTABILIDAD. Se escribe una vez al promover, con la tasa congelada
 *     por fila, es auditable y no cambia nunca.
 *   · esto es una LENTE. Una multiplicación en tiempo de lectura sobre una cifra YA
 *     consolidada, con UNA tasa explícita, que no se escribe en ninguna parte y siempre va
 *     rotulada con la tasa y su fecha.
 *
 * Mezclarlas produce exactamente el número que aquella nota temía: uno que no es ninguna de
 * las dos monedas, presentado como si fuera plata de verdad. Por eso la conversión vive en
 * este archivo y en ninguna pantalla.
 *
 * ═══ ⚠️ LA DIRECCIÓN ES UNA DIVISIÓN, Y ES AL REVÉS QUE LA INGESTA ═══
 *
 * La tasa se guarda como `quote → base`: con base GTQ, `7.7` significa "1 USD son 7,7 GTQ".
 * La ingesta MULTIPLICA (`computeAmountBase` en el backend: `originalAmount * fxRate`), porque
 * va de la moneda original a la base. Esta lente va al revés —de la base a la otra moneda— y
 * por lo tanto DIVIDE.
 *
 * Es el error más caro que se puede cometer acá y no falla de forma visible: con 7,7,
 * multiplicar donde había que dividir infla la cifra 59 veces. En la pantalla principal de una
 * herramienta financiera, eso es un número plausible y completamente falso. Por eso hay una
 * sola función que lo hace y tiene test.
 */

export interface TasaDeVista {
  /** Tal como se guarda: `quote → base`. Con base GTQ y quote USD, ~7,7. */
  rate: number;
  effectiveDate: string;
}

/**
 * Una cifra consolidada en la moneda base, expresada en la otra moneda.
 *
 * Devuelve `null` cuando la tasa no sirve para dividir (cero, negativa o no finita) en vez de
 * producir `Infinity` o `NaN`, que la pantalla formatearía como una cifra. El llamador tiene
 * que tratar ese `null` como "no se puede mostrar en esta moneda", igual que trata la falta
 * de tasa.
 */
export function convertirDesdeBase(montoEnBase: number, tasa: TasaDeVista): number | null {
  if (!Number.isFinite(tasa.rate) || tasa.rate <= 0) return null;
  if (!Number.isFinite(montoEnBase)) return null;
  return montoEnBase / tasa.rate;
}

/**
 * Qué moneda se está mostrando y con qué tasa. Es el valor que las pantallas leen; una que
 * muestra la base no necesita tasa y por eso `tasa` es `null` ahí.
 */
export type VistaDeMoneda =
  | { moneda: Currency; esBase: true; tasa: null }
  | { moneda: Currency; esBase: false; tasa: TasaDeVista };

/**
 * Aplica la lente a una cifra en base. En la vista base es la identidad — y eso importa: las
 * pantallas llaman a esta función SIEMPRE, no solo cuando hay conversión, para que no exista
 * un camino que se olvide de convertir.
 */
export function montoEnVista(montoEnBase: number, vista: VistaDeMoneda): number | null {
  return vista.esBase ? montoEnBase : convertirDesdeBase(montoEnBase, vista.tasa);
}
