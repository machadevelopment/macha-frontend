'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { computeRange, type DateRange, type PeriodKey } from '@/lib/period';

/**
 * El período elegido en el dashboard, compartido por los componentes que lo necesitan.
 *
 * ═══ POR QUÉ UN CONTEXTO Y NO ESTADO LOCAL ═══
 *
 * CU-868krkqh2. El estado del período vivía DENTRO de `period-kpis.tsx`, que es quien monta
 * el `PeriodFilter`. Correcto mientras nadie más lo necesitara — pero el saludo del
 * dashboard también habla del período ("Así va tu negocio este mes") y está en otra rama del
 * árbol, arriba y fuera del grid. Sin un canal común, la única forma de que el subtítulo
 * dijera la verdad era repetir la frase quemada, que es exactamente lo que reportó Macha:
 * cambiabas a "Este año" y el saludo seguía diciendo "este mes".
 *
 * No se sube el estado a la página porque `dashboard/page.tsx` es un Server Component: para
 * levantarlo ahí habría que volver cliente la pantalla entera, incluida la lectura del
 * diccionario y del locale que hoy se resuelven en el servidor.
 *
 * ═══ ALCANCE: SOLO EL DASHBOARD ═══
 *
 * Analítica y Ventas por producto montan su PROPIO `PeriodFilter` con su propio estado, y
 * así debe seguir: son pantallas distintas y que cambiar el período en una moviera las otras
 * sería una sorpresa, no una comodidad. Por eso el provider se monta en `dashboard/page.tsx`
 * y no en el layout de `(app)`.
 *
 * `usePeriodScope` REVIENTA fuera del provider en vez de devolver un default. Un default
 * silencioso ("mes") haría que un componente mal montado mostrara datos plausibles del
 * período equivocado — el mismo tipo de fallo mudo que este ticket vino a arreglar.
 */
export interface PeriodScopeValue {
  periodo: PeriodKey;
  rango: DateRange;
  cambiar: (key: PeriodKey, rango: DateRange) => void;
}

const Ctx = createContext<PeriodScopeValue | null>(null);

export function PeriodScope({ children }: { children: React.ReactNode }) {
  // Mismo arranque que tenía `period-kpis`: el mes en curso. El inicializador es perezoso
  // para no recalcular el rango en cada render.
  const [periodo, setPeriodo] = useState<PeriodKey>('month');
  const [rango, setRango] = useState<DateRange>(() => computeRange('month', new Date()));

  const cambiar = useCallback((key: PeriodKey, r: DateRange) => {
    setPeriodo(key);
    setRango(r);
  }, []);

  const value = useMemo(() => ({ periodo, rango, cambiar }), [periodo, rango, cambiar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePeriodScope(): PeriodScopeValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('usePeriodScope se usó fuera de <PeriodScope>.');
  return value;
}
