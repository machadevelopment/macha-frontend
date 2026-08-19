import { formatNumber } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';
import type { RuleUnit } from '@/lib/alerts/rule-units';

/**
 * El valor de una alerta, con los decimales que corresponden a SU unidad — CU-868ktkjv4.
 *
 * ═══ QUÉ SE VEÍA ═══
 *
 * El histórico y el detalle imprimían el campo tal como llega de la API:
 *
 *     Revenue drop    52.2850 %    15.0000 %
 *
 * `triggered_value` y `threshold` son `numeric(18,4)` en Postgres, y Drizzle los entrega
 * como STRING para no perder precisión — con sus cuatro decimales puestos. Escribirlos
 * directo en el JSX salta el sistema de formato entero, y el resultado es lo de arriba:
 * cuatro decimales en un porcentaje que el usuario lee de un vistazo, y un umbral redondo
 * arrastrando ceros. Es la mitad de por qué la pantalla se reportó como "poco profesional".
 *
 * El separador decimal, en cambio, NO se rompía: `es-GT` usa punto y coma de miles, igual
 * que `en-US`. Vale anotarlo porque invita a concluir que el locale no hace falta acá —
 * sí hace, y en un número de cuatro cifras la coma de miles ya los distingue.
 *
 * ═══ POR QUÉ NO ES UN `toFixed(1)` Y YA ═══
 *
 * Porque los decimales dependen de la unidad, no del gusto. `ar_overdue` se mide en DÍAS
 * de vencimiento: "74,0 días" sugiere una precisión que no existe —no hay medio día de
 * mora en el ledger— y encima el rail del dashboard ya lo estaba haciendo, porque forzaba
 * un decimal para todas las reglas por igual.
 *
 * Los porcentajes sí llevan uno: la diferencia entre 52,3 % y 52 % importa cuando el
 * umbral está en 50, y es justo el caso que dispara la alerta.
 *
 * ═══ POR QUÉ VIVE ACÁ ═══
 *
 * Lo necesitan TRES pantallas —el histórico, el detalle y el rail del dashboard— y hasta
 * ahora cada una decidía por su cuenta: dos imprimían crudo y la tercera forzaba un
 * decimal. Tres criterios para el mismo número es cómo se llega a que la misma alerta se
 * lea distinta según dónde la mires, que es exactamente lo que CU-868kt94an acaba de
 * costar caro en este mismo módulo.
 */
export function formatAlertValue(value: string | number, unit: RuleUnit, locale: Locale): string {
  return formatNumber(value, locale, unit === 'days' ? 0 : 1);
}
