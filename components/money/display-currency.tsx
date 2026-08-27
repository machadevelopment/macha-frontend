'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '@/lib/api/browser';
import type { VistaDeMoneda } from '@/lib/fx-display';
import type { Currency } from '@/lib/format';
import type { FxRateDisplayResponse } from '@/app/api/fx-rate-display/route';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * EN QUÉ MONEDA SE ESTÁN MIRANDO LAS CIFRAS
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Guarda UNA sola cosa: si el usuario quiere ver la moneda base o la otra. La tasa NO vive
 * acá, y esa separación es lo que hace que el mecanismo funcione en dos pantallas con
 * períodos independientes.
 *
 * ═══ POR QUÉ LA ELECCIÓN VA EN EL LAYOUT Y NO EN CADA PANTALLA ═══
 *
 * `PeriodScope` es deliberadamente del Dashboard: que cambiar el período en una pantalla
 * moviera las otras "sería una sorpresa, no una comodidad". Con la moneda pasa lo contrario.
 * Alguien que puso el Dashboard en dólares y entra a Analítica espera seguir en dólares; que
 * volviera a quetzales sola sería la sorpresa, y además invitaría a comparar dos pantallas
 * que no están en la misma unidad. Por eso el provider se monta en `app/(app)/layout.tsx` y
 * la elección sobrevive a la navegación entre pantallas.
 *
 * Se pierde al recargar la página, y está bien: es una preferencia de lectura del momento, no
 * una configuración de la empresa. La configuración de la empresa es la TASA, y esa sí está
 * guardada.
 *
 * ═══ LA TASA SE PIDE POR PANTALLA, CON SU PROPIO PERÍODO ═══
 *
 * La tasa aplicable es la vigente al CIERRE del período que se está mirando (decisión de
 * Keneth), y cada pantalla tiene el suyo: el Dashboard usa `PeriodScope` y Analítica su
 * propio estado local. Si la tasa viviera en este contexto, tendría que conocer el período de
 * la pantalla activa — que es exactamente el acoplamiento que `PeriodScope` evita. Por eso
 * `useVistaDeMoneda(hasta)` recibe la fecha de cierre y resuelve la suya.
 *
 * La consecuencia buena es que el Dashboard mirando agosto y Analítica mirando el año usan
 * cada uno la tasa que le corresponde, sin coordinarse.
 */

interface EleccionDeMoneda {
  /** `true` = el usuario quiere ver la moneda que NO es la base. */
  enLaOtra: boolean;
  alternar: () => void;
}

const Ctx = createContext<EleccionDeMoneda | null>(null);

export function DisplayCurrencyScope({ children }: { children: React.ReactNode }) {
  const [enLaOtra, setEnLaOtra] = useState(false);
  const alternar = useCallback(() => setEnLaOtra((v) => !v), []);
  const value = useMemo(() => ({ enLaOtra, alternar }), [enLaOtra, alternar]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Los estados que puede tener el control, y son cuatro porque cada uno se pinta distinto:
 *
 *   · `cargando`    — todavía no sabemos si hay tasa. No se ofrece el botón: ofrecerlo y
 *                     retirarlo es peor que esperar un instante.
 *   · `una-moneda`  — la empresa tiene tasa y se puede alternar. El caso normal.
 *   · `sin-tasa`    — no hay ninguna tasa registrada. ESTE es el que dispara el flujo que
 *                     pidió Keneth: en vez de convertir, se invita a configurarla.
 *   · `no-aplica`   — la llamada falló. Se muestra la base y no se ofrece nada, igual que
 *                     hace `CurrencyNote`: es contexto sobre las cifras, no las cifras.
 */
export type EstadoDeVista = 'cargando' | 'una-moneda' | 'sin-tasa' | 'no-aplica';

export interface VistaDeMonedaHook {
  /** Qué moneda y con qué tasa se están mostrando las cifras AHORA. */
  vista: VistaDeMoneda;
  /** La moneda base de la empresa, para rotular la cifra de apoyo. */
  base: Currency;
  /** La otra moneda del par, aunque no haya tasa: el botón necesita nombrarla. */
  otra: Currency;
  estado: EstadoDeVista;
  alternar: () => void;
}

const VISTA_DESCONOCIDA: VistaDeMoneda = { moneda: 'GTQ', esBase: true, tasa: null };

/**
 * @param hasta Fecha de cierre del período en pantalla (`YYYY-MM-DD`). La tasa que se aplica
 *   es la vigente en esa fecha.
 */
export function useVistaDeMoneda(hasta: string): VistaDeMonedaHook {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVistaDeMoneda se usó fuera de <DisplayCurrencyScope>.');

  const [data, setData] = useState<FxRateDisplayResponse | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    void request<FxRateDisplayResponse>(`/api/fx-rate-display?on=${hasta}`).then((r) => {
      // Sin esta guarda, cambiar de período rápido puede hacer que la respuesta VIEJA llegue
      // después de la nueva y pise la tasa correcta con la del período anterior.
      if (!vigente) return;
      if (r.ok) {
        setData(r.data);
        setFallo(false);
      } else {
        setFallo(true);
      }
    });
    return () => {
      vigente = false;
    };
  }, [hasta]);

  const estado: EstadoDeVista = fallo
    ? 'no-aplica'
    : !data
      ? 'cargando'
      : data.rate
        ? 'una-moneda'
        : 'sin-tasa';

  const base = (data?.baseCurrency ?? 'GTQ') as Currency;
  const otra = (data?.quoteCurrency ?? 'USD') as Currency;

  /*
   * ⚠️ LA VISTA CAE A LA BASE SIEMPRE QUE NO HAYA UNA TASA UTILIZABLE, aunque el usuario haya
   * pedido la otra moneda. Es la propiedad que impide el peor fallo posible de esta pantalla:
   * cifras en quetzales rotuladas como dólares. Si la tasa desaparece —falla la llamada, se
   * cambia a un período sin tasa— las cifras vuelven a la base Y el rótulo vuelve con ellas,
   * porque los dos salen de este mismo objeto.
   */
  const vista: VistaDeMoneda = useMemo(() => {
    if (!data) return VISTA_DESCONOCIDA;
    if (!ctx.enLaOtra || !data.rate) return { moneda: base, esBase: true, tasa: null };
    return { moneda: otra, esBase: false, tasa: data.rate };
  }, [data, ctx.enLaOtra, base, otra]);

  return { vista, base, otra, estado, alternar: ctx.alternar };
}
