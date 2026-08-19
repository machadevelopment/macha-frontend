import { describe, expect, test } from 'bun:test';
import { formatAlertValue } from '@/lib/alerts/format-alert-value';

/**
 * CU-868ktkjv4. Lo que se veía en la captura de QA: `52.2850 %` contra `15.0000 %`.
 *
 * Son `numeric(18,4)` de Postgres, que Drizzle entrega como STRING para no perder
 * precisión — con sus cuatro decimales. Escribirlos directo en el JSX salta el sistema de
 * formato entero, incluido el separador decimal del locale.
 */
describe('formatAlertValue', () => {
  test('un porcentaje se muestra con UN decimal, no con cuatro', () => {
    expect(formatAlertValue('52.2850', 'percent', 'en')).toBe('52.3');
  });

  test('los días no llevan decimales', () => {
    // "74,0 días" sugiere una precisión que el ledger no tiene: no hay medio día de mora.
    // El rail del dashboard forzaba un decimal para todas las reglas y caía justo acá.
    expect(formatAlertValue('74.0000', 'days', 'en')).toBe('74');
  });

  test('un umbral redondo deja de arrastrar ceros', () => {
    // `15.0000 %` era la mitad del ruido de la pantalla: el umbral SIEMPRE es redondo.
    expect(formatAlertValue('15.0000', 'percent', 'en')).toBe('15.0');
  });

  test('pasa por el formateador de locale, aunque es-GT coincida con en-US', () => {
    /*
     * Guatemala usa PUNTO decimal y coma de miles, igual que en-US, así que acá los dos
     * idiomas dan lo mismo — y por eso el test afirma el paso por el formateador con un
     * número que sí los distingue: el separador de miles.
     *
     * Importa dejarlo escrito: es fácil mirar "52.3" en las dos columnas y concluir que
     * el locale no hace falta. Sí hace, y el día que se agregue un idioma con coma
     * decimal, imprimir crudo volvería a estar mal sin que nada avise.
     */
    expect(formatAlertValue('52.2850', 'percent', 'es')).toBe('52.3');
    expect(formatAlertValue('1234.5000', 'percent', 'es')).toBe('1,234.5');
  });

  test('acepta número además de string, porque la API manda string', () => {
    expect(formatAlertValue(52.285, 'percent', 'en')).toBe('52.3');
  });

  test('redondea, no trunca', () => {
    expect(formatAlertValue('52.2500', 'percent', 'en')).toBe('52.3');
    expect(formatAlertValue('74.6000', 'days', 'en')).toBe('75');
  });
});
