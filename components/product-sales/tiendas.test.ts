import { describe, expect, test } from 'bun:test';
import { estadoDeTiendas } from './tiendas';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';
import type { StoreBreakdownResponse } from '@/lib/api/dashboard';

/**
 * CU-868kuw1e3 — la tarjeta de "Ventas por tienda".
 *
 * Lo que se prueba acá es EL ÚNICO PUNTO de la tarjeta que puede estar mal sin que nada se
 * vea roto: los tres estados se pintan igual de bien y elegir el equivocado produce una
 * pantalla correcta que dice una mentira.
 */
const resp = (
  rows: StoreBreakdownResponse['rows'],
  unattributedTotal: number,
): StoreBreakdownResponse => ({ baseCurrency: 'GTQ', rows, unattributedTotal });

const tienda = (name: string, total: number) => ({
  storeId: `id-${name}`,
  name,
  total,
  transactionCount: 1,
  sharePct: 100,
});

describe('estadoDeTiendas', () => {
  test('con tiendas, se pinta el ranking aunque haya ventas sin atribuir', () => {
    expect(estadoDeTiendas(resp([tienda('NORTE', 1000)], 0))).toBe('ranking');
    expect(estadoDeTiendas(resp([tienda('NORTE', 1000)], 500))).toBe('ranking');
  });

  test('vendió pero ninguna venta trae tienda: es FALTA DE COLUMNA, no falta de ventas', () => {
    /*
     * El caso normal de una PYME, y el que el ticket describe: el Excel no trae columna de
     * tienda. Es un hueco que el dueño puede cerrar solo, así que la tarjeta le dice cómo.
     */
    expect(estadoDeTiendas(resp([], 4200))).toBe('sin-columna');
  });

  test('sin ventas en el período NO se confunde con "tu archivo no trae tiendas"', () => {
    /*
     * Los dos devuelven `rows: []`. Si dijeran lo mismo, el dueño que SÍ tiene sucursales
     * abriría un lunes sin ventas, leería "tus ventas no traen tienda" y concluiría que el
     * producto no soporta sucursales — justo al revés de lo que pasa.
     *
     * `unattributedTotal` es lo único que los separa, y por eso el backend lo manda siempre,
     * también en cero.
     */
    expect(estadoDeTiendas(resp([], 0))).toBe('sin-ventas');
  });

  test('los tres mensajes existen y NO son el mismo texto', () => {
    // Un copy/paste entre las dos claves haría pasar los tests de arriba y dejaría la
    // distinción sin efecto en pantalla, que es lo que de verdad importa.
    for (const d of [es, en]) {
      const t = d.productSales;
      for (const clave of [
        'salesByStore',
        'storesEmptyNoColumn',
        'storesEmptyNoColumnHint',
        'storesEmptyNoSales',
        'storesUnattributed',
      ] as const) {
        expect(t[clave].trim()).not.toBe('');
      }
      expect(t.storesEmptyNoColumn).not.toBe(t.storesEmptyNoSales);
    }
  });

  test('el aviso de ventas sin tienda lleva el hueco `{amount}`', () => {
    /*
     * Es plata de verdad y se escribe como monto, no como porcentaje: la participación del
     * donut está calculada sobre las ventas CON tienda, así que siempre suma 100 %. Sin este
     * renglón, ese 100 % se lee como el 100 % de lo que la empresa vendió.
     */
    for (const d of [es, en]) {
      expect(d.productSales.storesUnattributed).toContain('{amount}');
    }
  });
});
