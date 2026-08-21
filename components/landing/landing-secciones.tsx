import { InsightPoint } from '@/components/ui/insight-point';
import type { Dictionary } from '@/lib/i18n/dictionary';

type L = Dictionary['landing'];

/**
 * Las secciones ESTÁTICAS de la landing (las que no llevan estado de cliente).
 *
 * Van juntas en un archivo y no una por archivo porque comparten el mismo esqueleto —eyebrow,
 * titular, bajada— y separarlas obligaría a repetirlo cinco veces. Los acordeones sí viven
 * aparte: son componentes de cliente y esa frontera merece un archivo propio.
 *
 * El titular de sección es `text-section` (52px/400 con clamp). Ver la tabla de medición en
 * `tailwind.config.ts`.
 */

/** Encabezado común: eyebrow + titular + bajada opcional. */
function Encabezado({
  eyebrow,
  title,
  subtitle,
  ancho = '24ch',
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  ancho?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-faint">{eyebrow}</p>
      <h2 className="text-section text-foreground" style={{ maxWidth: ancho }}>
        {title}
      </h2>
      {subtitle && <p className="mt-2 max-w-[74ch] text-body text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/**
 * "Tus datos ya están ahí" — la comparación fragmentado / centralizado.
 *
 * Dos tarjetas lado a lado: a la izquierda los archivos sueltos con su estado, a la derecha la
 * misma información ordenada. La izquierda usa tinta apagada y la derecha tinta plena: es la
 * única señal que hace leer la comparación sin leer las palabras.
 */
export function SeccionPorque({ labels }: { labels: L }) {
  const t = labels.porque;
  return (
    <section className="flex flex-col gap-12">
      <Encabezado eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} ancho="26ch" />

      <div className="grid grid-cols-1 gap-5 app:grid-cols-2">
        {/* Izquierda: el problema. */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-faint">
              {t.fragmentado.eyebrow}
            </p>
            <p className="font-mono text-eyebrow uppercase text-faint">{t.fragmentado.hoy}</p>
          </div>
          <ul className="mt-5 flex flex-col">
            {t.fragmentado.filas.map((f) => (
              <li
                key={f.archivo}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3.5 first:border-t-0 first:pt-0"
              >
                <span className="text-body text-muted-foreground">{f.archivo}</span>
                <span className="text-micro text-faint">{f.estado}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Derecha: el resultado. El chip de "Sincronizado" es el único verde de la sección, y es
            funcional (dice "esto está bien"), no de marca. */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-faint">
              {t.centralizado.eyebrow}
            </p>
            <span className="rounded-pill border border-success-bd bg-success-bg px-2 py-0.5 text-micro font-medium text-success">
              {t.centralizado.sincronizado}
            </span>
          </div>
          <p className="mt-4 text-cardh2 text-foreground">{t.centralizado.titulo}</p>

          <div className="mt-4 grid grid-cols-2 gap-x-4">
            <p className="font-mono text-eyebrow uppercase text-faint">{t.centralizado.colInfo}</p>
            <p className="font-mono text-eyebrow uppercase text-faint">
              {t.centralizado.colEstado}
            </p>
          </div>
          <ul className="mt-1 flex flex-col">
            {t.centralizado.filas.map((f) => (
              <li key={f.info} className="grid grid-cols-2 gap-x-4 border-t border-border py-3">
                <span className="text-body text-foreground">{f.info}</span>
                <span className="text-body text-muted-foreground">{f.estado}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-body text-muted-foreground">{t.centralizado.pie}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * "Tres pasos entre tus datos y tu decisión."
 *
 * Los pasos van numerados con `01/02/03` en mono, que es el patrón de numeración que el diseño
 * usa en toda la landing. La fila de flujo de arriba (tus datos → Macha → insights) se colapsa
 * en móvil: tres etiquetas con flechas no caben, y verticalmente el orden ya se lee solo.
 */
export function SeccionComo({ labels }: { labels: L }) {
  const t = labels.como;
  return (
    <section id="como-funciona" className="flex flex-col gap-12">
      <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="24ch" />

      <div className="hidden items-center gap-4 app:flex">
        <span className="text-[18px] font-light text-muted-foreground">{t.flujo.datos}</span>
        <span aria-hidden className="text-[17px] text-faint">
          →
        </span>
        <span className="text-[18px] font-semibold text-foreground">{t.flujo.macha}</span>
        <span aria-hidden className="text-[17px] text-faint">
          →
        </span>
        <span className="text-[18px] font-light text-muted-foreground">{t.flujo.insights}</span>
      </div>

      <ol className="grid grid-cols-1 gap-8 app:grid-cols-3">
        {t.pasos.map((p, i) => (
          <li key={p.titulo} className="flex flex-col gap-3 border-t border-border pt-5">
            <span className="font-mono text-body text-faint">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-[24px] font-normal leading-tight tracking-[-0.02em] text-foreground">
              {p.titulo}
            </h3>
            <p className="text-body text-muted-foreground">{p.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * "Tu negocio tiene preguntas. Macha tiene contexto." — el asesor con IA.
 *
 * ═══ ESTA ES LA SECCIÓN DE FONDO OSCURO ═══
 *
 * El diseño la pinta sobre tinta, no sobre lienzo. Se consigue con `.inverse`, la clase de
 * superficie invertida que ya existe en `globals.css` — no con colores a mano: dentro de ella
 * todos los tokens (`--foreground`, `--border`, `--muted-foreground`) se redefinen, así que los
 * mismos nombres siguen funcionando y la sección respeta el tema.
 *
 * Las tres preguntas de ejemplo son ESTÁTICAS: se muestran las tres con su respuesta, en vez de
 * un carrusel donde solo se ve una. Un carrusel esconde dos tercios del argumento detrás de una
 * interacción que nadie hace mientras lee una landing.
 */
export function SeccionAsesor({ labels }: { labels: L }) {
  const t = labels.asesor;
  return (
    <section className="inverse relative overflow-hidden rounded-2xl bg-canvas px-6 py-16 app:px-12">
      {/* El punto de marca como atmósfera. Acá el salvia corresponde: no hay un dato en pantalla,
          son preguntas y respuestas en prosa. */}
      <InsightPoint variant="ambient" className="-right-32 -top-32 h-[420px] w-[420px]" />

      <div className="relative flex flex-col gap-4">
        <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-muted-foreground">
          {t.eyebrow}
        </p>
        <h2 className="max-w-[24ch] text-sectionbig text-foreground">{t.title}</h2>
        <p className="mt-2 max-w-[70ch] text-body text-muted-foreground">{t.subtitle}</p>
      </div>

      <ul className="relative mt-12 grid grid-cols-1 gap-5 app:grid-cols-3">
        {t.preguntas.map((p) => (
          <li key={p.q} className="flex flex-col gap-4 rounded-xl border border-border p-5">
            {/* La pregunta es del usuario y la respuesta de Macha: la pregunta va en tinta plena
                y la respuesta atenuada, que es cómo el diseño distingue las dos voces. */}
            <p className="text-body text-foreground">{p.q}</p>
            <p className="text-[15px] font-light leading-relaxed text-muted-foreground">{p.a}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Lo que tomaba horas, ahora ocurre en segundos." — automatización.
 *
 * Cuatro etapas a la izquierda y un panel de alertas a la derecha. Las alertas reusan la misma
 * forma que las del acordeón de capacidades: título, descripción y meta. Es a propósito — son la
 * misma pieza del producto y en el diseño se ven igual.
 */
export function SeccionAutomatizacion({ labels }: { labels: L }) {
  const t = labels.automatizacion;
  return (
    <section className="flex flex-col gap-12">
      <Encabezado eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} ancho="26ch" />

      <div className="grid grid-cols-1 gap-8 app:grid-cols-[1fr_1fr]">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 self-start">
          {t.etapas.map((e) => (
            <li key={e.titulo} className="flex flex-col gap-1 border-t border-border pt-4">
              <span className="text-body font-semibold text-foreground">{e.titulo}</span>
              <span className="text-micro text-faint">{e.sub}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-cardh2 text-foreground">{t.panel.titulo}</p>
          <ul className="mt-4 flex flex-col">
            {t.panel.items.map((i) => (
              <li
                key={i.titulo}
                className="flex gap-3 border-t border-border py-4 first:border-t-0 first:pt-0"
              >
                <InsightPoint size="sm" className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-body font-semibold text-foreground">{i.titulo}</p>
                  <p className="text-micro text-muted-foreground">{i.desc}</p>
                  {i.meta && <p className="text-micro text-faint">{i.meta}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * "La misma información, otra forma de trabajar." — antes y después.
 *
 * Cuatro pares enfrentados. El "antes" va en peso 300 y tinta apagada, el "con Macha" en 400 y
 * tinta plena: la comparación se lee sin leer los encabezados, que es lo que hace el diseño.
 */
export function SeccionAntesDespues({ labels }: { labels: L }) {
  const t = labels.antesDespues;
  return (
    <section className="flex flex-col gap-12">
      <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="26ch" />

      <div className="grid grid-cols-1 gap-x-8 app:grid-cols-2">
        <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-faint">
          {t.antesEyebrow}
        </p>
        <p className="mt-8 font-mono text-eyebrow uppercase tracking-[0.08em] text-faint app:mt-0">
          {t.conEyebrow}
        </p>

        {t.pares.map((p) => (
          <div key={p.antes} className="contents">
            <p className="border-t border-border py-6 text-[26px] font-light leading-tight tracking-[-0.02em] text-faint">
              {p.antes}
            </p>
            <p className="border-t border-border py-6 text-[26px] font-normal leading-tight tracking-[-0.02em] text-foreground">
              {p.con}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Tus datos son tuyos. Siempre." — seguridad, cuatro garantías en rejilla. */
export function SeccionSeguridad({ labels }: { labels: L }) {
  const t = labels.seguridad;
  return (
    <section className="grid grid-cols-1 gap-12 app:grid-cols-[1fr_1.2fr]">
      <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="16ch" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-7 app:grid-cols-2">
        {t.items.map((i) => (
          <li key={i.titulo} className="flex flex-col gap-1.5 border-t border-border pt-4">
            <p className="text-body font-semibold text-foreground">{i.titulo}</p>
            <p className="text-body text-muted-foreground">{i.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Un plan según tu operación." — los tres planes.
 *
 * ═══ NO HAY PRECIOS, Y NO ES UN OLVIDO ═══
 *
 * El diseño no los trae: dice "Definimos el alcance en la demo". Inventar cifras en la página de
 * precios de un producto financiero sería lo peor que podría hacer acá — un número que nadie
 * aprobó, en la pantalla donde el cliente decide si puede pagarlo.
 *
 * Por eso los tres planes llevan el MISMO CTA (solicitar demo) en vez de un botón de compra: la
 * conversión de esta sección es la conversación, no el checkout.
 */
export function SeccionPlanes({ labels, hrefDemo }: { labels: L; hrefDemo: string }) {
  const t = labels.planes;
  return (
    <section id="planes" className="flex flex-col gap-12">
      <div className="flex flex-col gap-4 app:flex-row app:items-end app:justify-between">
        <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="20ch" />
        <p className="max-w-[46ch] text-body text-muted-foreground">{t.nota}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 app:grid-cols-3">
        {t.items.map((p) => (
          <div
            key={p.nombre}
            className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-[24px] font-normal leading-tight tracking-[-0.02em] text-foreground">
                {p.nombre}
              </h3>
              <p className="text-body text-muted-foreground">{p.para}</p>
            </div>

            <ul className="flex flex-1 flex-col gap-2.5">
              {p.incluye.map((f) => (
                <li key={f} className="flex gap-2 text-body text-foreground">
                  {/* El punto de marca como viñeta. Es decorativo, así que va `aria-hidden` por
                      el propio componente: el lector de pantalla ya anuncia los items de la lista. */}
                  <InsightPoint size="sm" className="mt-1 h-2 w-2 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={hrefDemo}
              className="inline-flex items-center justify-center rounded-md border border-border bg-canvas px-4 py-2.5 text-body font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
