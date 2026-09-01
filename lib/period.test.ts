import { describe, expect, test } from 'bun:test';
import {
  computeRange,
  hayDatosFueraDelRango,
  localIsoDate,
  rangeDays,
  rollingRange,
  validateCustomRange,
  periodoInicial,
} from './period';

/** Jueves 6 de agosto de 2026, en hora local. */
const HOY = new Date(2026, 7, 6);

describe('computeRange (filtro de período)', () => {
  test('hoy es un solo día', () => {
    expect(computeRange('today', HOY)).toEqual({ from: '2026-08-06', to: '2026-08-06' });
  });

  test('la semana va de lunes a domingo', () => {
    // El 6 de agosto de 2026 es jueves; su semana empieza el lunes 3.
    // Con domingo como primer día, el lunes de trabajo caería en la semana anterior.
    expect(computeRange('week', HOY)).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });

  test('el lunes pertenece a su propia semana, no a la anterior', () => {
    const lunes = new Date(2026, 7, 3);
    expect(computeRange('week', lunes).from).toBe('2026-08-03');
  });

  test('el domingo cierra la semana en curso', () => {
    const domingo = new Date(2026, 7, 9);
    expect(computeRange('week', domingo)).toEqual({ from: '2026-08-03', to: '2026-08-09' });
  });

  test('el mes termina el último día real, sin tabla de 30/31', () => {
    expect(computeRange('month', HOY)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(computeRange('month', new Date(2026, 1, 15))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    // 2028 es bisiesto: el 29 tiene que aparecer sin código especial.
    expect(computeRange('month', new Date(2028, 1, 15)).to).toBe('2028-02-29');
  });

  test('el año va del 1 de enero al 31 de diciembre', () => {
    expect(computeRange('year', HOY)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  test('usa la fecha LOCAL y no UTC', () => {
    // Un dueño en Guatemala (UTC-6) a las 8 de la noche ya está en el día siguiente
    // según UTC. Si el rango se calculara en UTC, vería otro día durante seis horas.
    const nocheEnGuatemala = new Date(2026, 7, 6, 20, 30);
    expect(computeRange('today', nocheEnGuatemala)).toEqual({
      from: '2026-08-06',
      to: '2026-08-06',
    });
  });
});

describe('localIsoDate', () => {
  test('emite YYYY-MM-DD en local, con cero a la izquierda', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('no corre la fecha de noche en UTC-6', () => {
    // `toISOString()` sobre esto devolvería '2026-08-07' en Guatemala.
    expect(localIsoDate(new Date(2026, 7, 6, 20, 30))).toBe('2026-08-06');
  });
});

describe('validateCustomRange (CU-868knx137)', () => {
  test('acepta un rango normal', () => {
    expect(validateCustomRange('2026-08-01', '2026-08-05', HOY)).toBeNull();
  });

  test('acepta un rango de un solo día', () => {
    // Es lo que pide quien quiere ver un día puntual, y es lo mismo que devuelve
    // computeRange('today'). No es un caso degenerado.
    expect(validateCustomRange('2026-08-05', '2026-08-05', HOY)).toBeNull();
  });

  test('rechaza la fecha final anterior a la inicial', () => {
    expect(validateCustomRange('2026-08-05', '2026-08-01', HOY)).toBe('reversed');
  });

  test('rechaza cualquiera de las dos fechas vacía', () => {
    expect(validateCustomRange('', '2026-08-05', HOY)).toBe('incomplete');
    expect(validateCustomRange('2026-08-01', '', HOY)).toBe('incomplete');
  });

  test('rechaza el rango futuro', () => {
    expect(validateCustomRange('2026-08-01', '2026-08-07', HOY)).toBe('future');
  });

  test('hoy mismo NO es futuro', () => {
    // El borde exacto: `to === hoy` tiene que pasar. Si se comparara con `>=`, el
    // usuario nunca podría incluir el día en curso.
    expect(validateCustomRange('2026-08-01', '2026-08-06', HOY)).toBeNull();
  });

  test('un inicio futuro sale por reversed, no se cuela', () => {
    expect(validateCustomRange('2026-09-01', '2026-08-06', HOY)).toBe('reversed');
  });

  test('el orden de texto y el cronológico coinciden a través del cambio de año', () => {
    // La validación compara los YYYY-MM-DD como strings. Este es el caso donde una
    // comparación ingenua se rompería si el formato no llevara ceros a la izquierda.
    expect(validateCustomRange('2025-12-31', '2026-01-01', HOY)).toBeNull();
    expect(validateCustomRange('2026-01-01', '2025-12-31', HOY)).toBe('reversed');
  });

  test('no depende de la hora del día', () => {
    // Con `new Date('2026-08-06')` (medianoche UTC) el 6 de agosto habría sido "futuro"
    // en Guatemala durante seis horas cada noche.
    const nocheEnGuatemala = new Date(2026, 7, 6, 23, 59);
    expect(validateCustomRange('2026-08-06', '2026-08-06', nocheEnGuatemala)).toBeNull();
  });
});

/**
 * ═══ VENTANAS MÓVILES Y TAMAÑO DEL RANGO (pedido de Keneth, 2026-08-24) ═══
 *
 * Las píldoras dan períodos de CALENDARIO —este mes, este trimestre— y contestan "¿cómo voy en
 * agosto?". La pregunta que un dueño hace más seguido es "¿cómo vengo últimamente?", que no
 * tiene borde de calendario: el día 2 del mes, "este mes" son dos días de datos.
 *
 * Sin `rollingRange`, pedir "los últimos 30 días" costaba abrir el panel, elegir dos fechas en
 * el calendario del sistema y confirmar.
 */
describe('rollingRange', () => {
  const hoy = new Date(2026, 7, 24); // 24 ago 2026, local

  test('los últimos 7 días INCLUYEN hoy', () => {
    // Hoy y los seis anteriores: siete días de datos, que es lo que espera quien lo pide.
    expect(rollingRange(7, hoy)).toEqual({ from: '2026-08-18', to: '2026-08-24' });
  });

  test('30 y 90 días cruzan el borde del mes sin tocar el calendario', () => {
    expect(rollingRange(30, hoy)).toEqual({ from: '2026-07-26', to: '2026-08-24' });
    expect(rollingRange(90, hoy)).toEqual({ from: '2026-05-27', to: '2026-08-24' });
  });

  test('una ventana de 1 día es hoy', () => {
    expect(rollingRange(1, hoy)).toEqual({ from: '2026-08-24', to: '2026-08-24' });
  });

  test('cruza el cambio de año sin corrimientos', () => {
    expect(rollingRange(7, new Date(2026, 0, 3))).toEqual({
      from: '2025-12-28',
      to: '2026-01-03',
    });
  });
});

describe('rangeDays', () => {
  test('cuenta los dos extremos', () => {
    // Del 1 al 31 de agosto son 31 días, no 30: el dueño cuenta el primero y el último.
    expect(rangeDays({ from: '2026-08-01', to: '2026-08-31' })).toBe(31);
  });

  test('un solo día es 1', () => {
    expect(rangeDays({ from: '2026-08-24', to: '2026-08-24' })).toBe(1);
  });

  test('lo que devuelve rollingRange mide lo que se pidió', () => {
    // El par tiene que cerrar: si `rollingRange(30)` diera 31 días, la pantalla mostraría
    // "31 días seleccionados" bajo un botón que dice "Últimos 30 días".
    for (const n of [1, 7, 30, 90, 365]) {
      expect(rangeDays(rollingRange(n, new Date(2026, 7, 24)))).toBe(n);
    }
  });
});

/**
 * La nota de cobertura: qué abarca lo que el cliente subió (2026-08-25).
 *
 * El caso que la motiva es CarsGT: 19 meses cargados (feb 2025 → ago 2026) y el dashboard
 * abriendo en agosto. Las cifras estaban bien al quetzal y aun así el reporte fue "esta data
 * no tiene nada que ver con el Excel", porque contra los totales del archivo no se parecían a
 * nada. Ver el bloque de `hayDatosFueraDelRango`.
 */
describe('avisar cuando el período visible deja datos afuera', () => {
  const agosto = { from: '2026-08-01', to: '2026-08-31' };

  test('el caso de CarsGT: 19 meses cargados, un mes a la vista', () => {
    expect(hayDatosFueraDelRango(agosto, { from: '2025-02-18', to: '2026-08-23' })).toBe(true);
  });

  test('avisa aunque solo sobresalga por un lado', () => {
    expect(hayDatosFueraDelRango(agosto, { from: '2025-02-18', to: '2026-08-15' })).toBe(true);
    expect(hayDatosFueraDelRango(agosto, { from: '2026-08-05', to: '2026-09-30' })).toBe(true);
  });

  /*
   * Se calla cuando no hay nada que advertir. Una nota que sale siempre deja de leerse, y la
   * que importa —la de arriba— se pierde con ella.
   */
  test('calla cuando el período ya cubre todos los datos', () => {
    expect(hayDatosFueraDelRango(agosto, { from: '2026-08-03', to: '2026-08-20' })).toBe(false);
    // Coincidencia exacta en los dos extremos: cubierto, no sobresale.
    expect(hayDatosFueraDelRango(agosto, agosto)).toBe(false);
  });

  test('calla cuando la empresa todavía no tiene datos', () => {
    expect(hayDatosFueraDelRango(agosto, null)).toBe(false);
    expect(hayDatosFueraDelRango(agosto, undefined)).toBe(false);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EL RANGO DEL ENLACE MANDA SOBRE EL DEFAULT (2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `/analytics?from=…&to=…` abría SIEMPRE en "este mes" y descartaba el rango en silencio. Es el
 * mismo daño que `hayDatosFueraDelRango` documenta y que costó un día entero: el cliente ve
 * cifras correctas de OTRO período y concluye que el sistema no leyó su archivo.
 */
describe('periodoInicial', () => {
  const HOY = new Date(2026, 8, 1); // 1 de septiembre de 2026

  test('el rango del enlace gana, y el selector queda en «personalizado»', () => {
    const r = periodoInicial({ from: '2026-01-01', to: '2026-06-30' }, HOY);
    expect(r.rango).toEqual({ from: '2026-01-01', to: '2026-06-30' });
    /*
     * `custom` no es un detalle: sin él la pantalla mostraría el rango del enlace con "Este
     * mes" resaltado — dos cosas que se contradicen sobre el mismo período, en el control que
     * existe justamente para explicarlo.
     */
    expect(r.periodo).toBe('custom');
  });

  test('sin rango, abre en el default y nada cambia', () => {
    /*
     * La guarda del arreglo: esto solo puede AGREGAR sobre un enlace que trae rango. Quien
     * entra por el menú tiene que ver exactamente lo de antes, o estaría cambiando la pantalla
     * que abre el 99 % de las veces para arreglar el 1 %.
     */
    const r = periodoInicial(undefined, HOY);
    expect(r.periodo).toBe('month');
    expect(r.rango).toEqual(computeRange('month', HOY));
  });
});
