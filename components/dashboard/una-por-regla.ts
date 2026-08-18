/**
 * Una alerta por regla, la más reciente de cada una — CU-868ktkp9w.
 *
 * ═══ POR QUÉ HACE FALTA ═══
 *
 * El motor de alertas escribe un evento en CADA evaluación, también cuando la ventana de
 * no-repetición de 7 días le impide notificar: `alert_events` es el historial completo, y
 * eso es deliberado. Como se evalúa después de cada carga de Excel, una misma regla
 * acumula varias filas casi idénticas en pocos días.
 *
 * Para `/alerts`, que ES el historial, está bien. Para el rail del dashboard no: pedir las
 * 4 más recientes mostraba "Caída de ingresos" y "Margen bajo" DOS VECES cada una, con la
 * misma fecha y el mismo valor — así salió en el reporte de QA. El dueño lee cuatro
 * problemas donde hay dos, y un resumen que repite deja de ser un resumen.
 *
 * ═══ POR QUÉ NO COMPARA FECHAS ═══
 *
 * La API devuelve por fecha descendente, así que la PRIMERA aparición de cada regla ya es
 * su evento más nuevo. Ordenar aquí otra vez sería duplicar —y poder contradecir— un
 * criterio que ya vive en el backend.
 */
export function unaPorRegla<T extends { ruleKey: string }>(items: T[]): T[] {
  const vistas = new Set<string>();
  return items.filter((a) => {
    if (vistas.has(a.ruleKey)) return false;
    vistas.add(a.ruleKey);
    return true;
  });
}
