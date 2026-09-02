import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 * ⚠️ `tailwind-merge` BORRABA TODOS NUESTROS TAMAÑOS DE TEXTO (2026-09-01)
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 *
 * `twMerge` resuelve conflictos por GRUPO de clases, y su tabla de grupos es la de Tailwind por
 * defecto. Nuestra escala tipográfica es custom (`body`, `micro`, `kpi`, `eyebrow`…), así que
 * `text-body` no le consta como tamaño: lo mete en el grupo de COLOR de texto junto a
 * `text-muted-foreground` y, al ser dos del mismo grupo, **descarta el primero**.
 *
 *     twMerge('text-body text-muted-foreground')  →  'text-muted-foreground'   ← el tamaño se fue
 *     twMerge('text-sm   text-muted-foreground')  →  'text-sm text-muted-foreground'
 *
 * Pasa en CUALQUIER componente que combine un tamaño propio con un color en el mismo `cn()`, y
 * no falla nada: el elemento se queda con el 16px del navegador y se ve "grande".
 *
 * Medido en producción: los tabs de Analítica declaran `text-body` (14px) y llegaban al DOM
 * **sin esa clase**, en 16px. Es el reporte de Jose —*"siento que los tabs son demasiado
 * grandes, aunque la letra y las gráficas son bastante grandes"*— y la causa no era de diseño:
 * el tamaño nunca se aplicó.
 *
 * Es el mismo modo de fallo que `chart-theme.ts` documenta con las clases de Tremor: la clase
 * se escribe, no llega, y nadie lo nota porque no hay error. Por eso el arreglo va acá y no en
 * el componente que lo destapó — arreglar solo los tabs habría dejado el resto de la escala
 * rota y sin nadie mirándola.
 *
 * ⚠️ La lista tiene que seguir a `fontSize` de `tailwind.config.ts`. Hay test que compara las
 * dos (`lib/cn.test.ts`): si alguien agrega un token nuevo y no lo suma acá, esa clase se
 * empieza a perder en silencio, que es exactamente lo que pasó.
 */
const TAMANOS_DE_TEXTO = [
  'h1', 'display', 'hero', 'sectionbig', 'section', 'lead', 'leyebrow', 'lnum', 'lhero',
  'lsub', 'lprose', 'lstrong', 'lrow', 'lstage', 'lsmall', 'lcard', 'lmeta', 'lchip',
  'lline', 'lanswer', 'pagetitle', 'cardh2', 'caption', 'body', 'kpi', 'statbig',
  'eyebrow', 'chip', 'micro', 'delta', 'tab', 'card', 'btn',
  // Las dos escalas a las que baja una cifra de KPI larga (`escalaDeCifra`). Sin ellas, una
  // tarjeta que combine tamaño y color perdería justo el encogido que evita que la cifra
  // mienta — ver la nota de `truncate` en CLAUDE.md.
  'kpi-sm', 'kpi-xs',
]; // prettier-ignore

const merge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: TAMANOS_DE_TEXTO }] } },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
