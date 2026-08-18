import { describe, expect, test } from 'bun:test';
import { es } from '@/lib/i18n/dictionaries/es';
import { en } from '@/lib/i18n/dictionaries/en';

/**
 * CU-868kt8bg0 — "no repetir el título dos veces".
 *
 * El equipo reportó que "Analítica" aparecía duplicado. No era un error de esa pantalla:
 * era un patrón. Tres secciones tenían el eyebrow y el `<h1>` diciendo lo mismo —
 * `ANALÍTICA` / "Analítica", `REPORTES` / "Reportes", `INVENTARIO` / "Inventario"— así que
 * la cabecera gastaba dos líneas para dar un dato.
 *
 * El eyebrow es la ETIQUETA de la sección (dónde estás, y la navegación ya lo dice); el
 * `<h1>` tiene que decir algo que el eyebrow no diga. Este test es la guarda: sin él, la
 * próxima pantalla nace con el mismo patrón y nadie lo nota hasta la siguiente ronda de QA.
 */

/** Compara ignorando mayúsculas y acentos: "ANALÍTICA" y "Analítica" son el mismo texto. */
const plano = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Las secciones con cabecera de pantalla, en los dos idiomas. */
function cabeceras(d: typeof es) {
  return [
    // CU-868ktkk32: analítica ya no lleva subtítulo — como reportes y como el dashboard.
    ['analytics', d.analytics.eyebrow, d.analytics.title, undefined],
    ['reports', d.reports.eyebrow, d.reports.title, undefined],
    ['inventory', d.inventory.eyebrow, d.inventory.title, d.inventory.subtitle],
    ['dashboard', d.dashboard.eyebrow, d.dashboard.title, undefined],
    ['chat', d.chat.eyebrow, d.chat.title, undefined],
    ['members', d.members.eyebrow, d.members.title, undefined],
  ] as const;
}

for (const [nombre, d] of [
  ['es', es],
  ['en', en],
] as const) {
  describe(`cabeceras de sección · ${nombre}`, () => {
    test('el título NO repite el eyebrow', () => {
      for (const [seccion, eyebrow, titulo] of cabeceras(d)) {
        expect(
          plano(eyebrow) === plano(titulo) ? `${seccion}: "${eyebrow}" = "${titulo}"` : 'ok',
        ).toBe('ok');
      }
    });

    test('el subtítulo tampoco repite el título', () => {
      // La otra mitad del mismo problema, y en la que caí al arreglar esto: cambiar el
      // título de Inventario a "Qué tienes en bodega" lo dejó idéntico al arranque de su
      // propio subtítulo. Tres líneas seguidas diciendo lo mismo es peor que dos.
      for (const [seccion, , titulo, subtitulo] of cabeceras(d)) {
        if (!subtitulo) continue;
        expect(
          plano(subtitulo).startsWith(plano(titulo)) ? `${seccion}: subtítulo repite` : 'ok',
        ).toBe('ok');
      }
    });
  });
}
