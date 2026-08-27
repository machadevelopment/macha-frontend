import { InsightPoint } from '@/components/ui/insight-point';
import { ANCLA_DEMO } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';

type L = Dictionary['landing'];

/**
 * Las secciones ESTÁTICAS de la landing (las que no llevan estado de cliente).
 *
 * Van juntas porque comparten el mismo esqueleto —eyebrow, titular, bajada— y separarlas
 * obligaría a repetirlo. Los acordeones y el asesor viven aparte: son componentes de cliente y
 * esa frontera merece archivo propio.
 *
 * El FONDO de cada sección no se decide acá sino en `app/page.tsx`, envolviéndolas en `<Banda>`.
 * Estos componentes no conocen su color, que es lo que permite que la sección oscura sea la misma
 * pieza que las claras.
 *
 * ═══ DOS FORMAS DE ENCABEZADO, Y NO SON INTERCAMBIABLES ═══
 *
 * Medido sobre el Figma, hay secciones donde la bajada va DEBAJO del titular (por qué existe,
 * automatización) y otras donde va a su DERECHA, alineada al pie (el producto, planes). No es
 * capricho del diseñador: donde la bajada va al lado, el titular es corto y lo que sigue abajo
 * ocupa todo el ancho —una fila de pestañas, tres columnas de planes—, así que apilar el texto
 * dejaría una franja vacía a la derecha del título. Se resuelve con `Encabezado` y
 * `EncabezadoPartido`.
 */

/** Eyebrow + titular + bajada apilados. */
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
      <p className="text-leyebrow uppercase text-muted-foreground">{eyebrow}</p>
      <h2 className="text-section text-foreground" style={{ maxWidth: ancho }}>
        {title}
      </h2>
      {subtitle && <p className="mt-2 max-w-[74ch] text-lsub text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Titular a la izquierda y bajada a la derecha, alineadas por el pie como en el diseño. */
function EncabezadoPartido({
  eyebrow,
  title,
  subtitle,
  ancho = '20ch',
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  ancho?: string;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-16">
      <Encabezado eyebrow={eyebrow} title={title} ancho={ancho} />
      <p className="max-w-[46ch] text-lsub text-muted-foreground md:pb-2">{subtitle}</p>
    </div>
  );
}

/**
 * "Tus datos ya están ahí. El problema es entenderlos."
 *
 * Dos tarjetas: a la izquierda los archivos sueltos con su estado, a la derecha la misma
 * información ordenada. La izquierda usa tinta apagada y la derecha tinta plena — es la señal que
 * hace leer la comparación sin leer las palabras.
 *
 * La tarjeta de la derecha es más ancha que la de la izquierda (medido: 300 contra 244 sobre 960,
 * o sea 55/45). Va así y no a mitades porque su tabla tiene tres columnas y el chip de estado es
 * lo primero que se aprieta contra el borde cuando falta espacio.
 */
export function SeccionPorque({ labels }: { labels: L }) {
  const t = labels.porque;
  return (
    <div className="flex flex-col gap-14">
      <Encabezado eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} ancho="26ch" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[45fr_55fr]">
        {/* Izquierda: el problema. */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-leyebrow uppercase text-faint">{t.fragmentado.eyebrow}</p>
          <p className="mt-6 text-leyebrow uppercase text-muted-foreground">{t.fragmentado.hoy}</p>
          <ul className="mt-3 flex flex-col">
            {t.fragmentado.filas.map((f) => (
              <li
                key={f.archivo}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3.5"
              >
                {/* La viñeta es un punto neutro, NO el punto de marca: acá está describiendo el
                    problema, y el salvia dice "esto es Macha". */}
                <span className="flex items-center gap-2.5 text-lprose text-muted-foreground">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-faint" />
                  {f.archivo}
                </span>
                <span className="text-lsmall text-faint">{f.estado}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Derecha: el resultado. */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <InsightPoint variant="figure" size="sm" className="h-4 w-4 shrink-0" />
            <p className="text-lcard text-foreground">{t.centralizado.titulo}</p>
          </div>

          <div className="mt-7 grid grid-cols-[1fr_1fr_auto] items-center gap-x-4">
            <p className="text-leyebrow uppercase text-faint">{t.centralizado.colInfo}</p>
            <p className="text-leyebrow uppercase text-faint">{t.centralizado.colEstado}</p>
            <span />
          </div>

          <ul className="mt-2 flex flex-col">
            {t.centralizado.filas.map((f) => (
              <li
                key={f.info}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-x-4 border-t border-border py-3"
              >
                <span className="text-lrow text-foreground">{f.info}</span>
                <span className="text-lrow text-muted-foreground">{f.estado}</span>
                {/*
                  El chip va POR FILA, no uno para toda la tarjeta como lo tenía antes. La
                  diferencia no es estética: uno arriba dice "esta tarjeta está sincronizada" —una
                  afirmación sobre el producto— y uno por fila dice "este dato está sincronizado",
                  que es lo que la sección está argumentando.

                  Verde FUNCIONAL (dice "esto va bien"), no salvia de marca, y con fondo y borde
                  además del color: es un rótulo de estado sin flecha ni otro canal, así que le
                  aplica el chip obligatorio de la regla de los dos verdes.
                */}
                <span className="flex items-center gap-1.5 rounded-pill border border-success-bd bg-success-bg px-2 py-0.5 text-lchip text-success">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                  {t.centralizado.sincronizado}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-start gap-2.5 border-t border-border pt-5 text-lsmall text-muted-foreground">
            <InsightPoint size="sm" className="mt-0.5 h-3 w-3 shrink-0" />
            {t.centralizado.pie}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * "Tres pasos entre tus datos y tu decisión."
 *
 * La fila de flujo (tus datos → Macha → insights) se colapsa en móvil: tres etiquetas con flechas
 * no caben, y verticalmente el orden ya se lee solo.
 *
 * Los tres pasos van separados por DIVISORES VERTICALES, que es como el diseño los agrupa. En
 * móvil pasan a un divisor superior por paso: una línea vertical entre bloques apilados no separa
 * nada.
 */
export function SeccionComo({ labels }: { labels: L }) {
  const t = labels.como;
  return (
    <div className="flex flex-col gap-12">
      <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="24ch" />

      <div className="hidden items-center gap-4 border-b border-border pb-5 md:flex">
        <span className="text-[18px] font-light text-muted-foreground">{t.flujo.datos}</span>
        <span aria-hidden className="text-[15px] text-faint">
          →
        </span>
        <span className="text-[18px] font-semibold text-foreground">{t.flujo.macha}</span>
        <span aria-hidden className="text-[15px] text-faint">
          →
        </span>
        <span className="text-[18px] font-light text-muted-foreground">{t.flujo.insights}</span>
      </div>

      <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-0">
        {t.pasos.map((p, i) => (
          <li
            key={p.titulo}
            className="flex flex-col gap-3 border-t border-border pt-5 md:border-t-0 md:border-l md:pl-8 md:pt-0 md:first:border-l-0 md:first:pl-0"
          >
            <span className="text-lnum text-faint">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-[24px] font-normal leading-tight tracking-[-0.02em] text-foreground">
              {p.titulo}
            </h3>
            <p className="text-lprose text-muted-foreground">{p.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * "Lo que tomaba horas, ahora ocurre en segundos." — automatización.
 *
 * Cuatro etapas a la izquierda y un panel de alertas a la derecha. Las alertas reusan la misma
 * forma que las del acordeón de capacidades: es a propósito, son la misma pieza del producto y en
 * el diseño se ven igual.
 */
export function SeccionAutomatizacion({ labels }: { labels: L }) {
  const t = labels.automatizacion;
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-10">
        <Encabezado eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} ancho="18ch" />

        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-4">
          {t.etapas.map((e) => (
            <li key={e.titulo} className="flex flex-col gap-1.5 border-t border-border pt-4">
              <span className="text-lstage text-foreground">{e.titulo}</span>
              <span className="text-lsmall text-faint">{e.sub}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="self-start rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <InsightPoint variant="figure" size="sm" className="h-4 w-4 shrink-0" />
          <p className="text-lcard text-foreground">{t.panel.titulo}</p>
        </div>
        <ul className="mt-2 flex flex-col">
          {t.panel.items.map((i) => (
            <li key={i.titulo} className="flex gap-3 border-t border-border py-4 last:pb-0">
              <InsightPoint size="sm" className="mt-1 h-3 w-3 shrink-0" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-lstrong text-foreground">{i.titulo}</p>
                <p className="text-lrow text-muted-foreground">{i.desc}</p>
                {i.meta && <p className="text-lmeta text-faint">{i.meta}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * "La misma información, otra forma de trabajar." — antes y después.
 *
 * Cuatro pares enfrentados. El "antes" va en peso 300 y tinta apagada, el "con Macha" en 400 y
 * tinta plena: la comparación se lee sin leer los encabezados, que es lo que hace el diseño. La
 * columna de la derecha lleva además una flecha de retorno, el único adorno de la sección y la
 * razón de que se entienda cuál lado es el resultado sin depender del peso tipográfico.
 */
export function SeccionAntesDespues({ labels }: { labels: L }) {
  const t = labels.antesDespues;
  return (
    <div className="flex flex-col gap-12">
      <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="24ch" />

      <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
        <p className="text-leyebrow uppercase text-faint">{t.antesEyebrow}</p>
        <p className="mt-10 text-leyebrow uppercase text-muted-foreground md:mt-0">
          {t.conEyebrow}
        </p>

        {t.pares.map((p) => (
          <div key={p.antes} className="contents">
            <p className="border-t border-border py-6 text-lline font-light text-faint">
              {p.antes}
            </p>
            <p className="flex items-baseline gap-2.5 border-t border-border py-6 text-lline font-normal text-foreground">
              <span aria-hidden className="text-[13px] text-faint">
                ↳
              </span>
              {p.con}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Tus datos son tuyos. Siempre." — titular a la izquierda, cuatro garantías en rejilla 2×2. */
export function SeccionSeguridad({ labels }: { labels: L }) {
  const t = labels.seguridad;
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
      <Encabezado eyebrow={t.eyebrow} title={t.title} ancho="14ch" />
      <ul className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
        {t.items.map((i) => (
          <li key={i.titulo} className="flex flex-col gap-1.5 border-t border-border pt-4">
            <p className="text-lstrong text-foreground">{i.titulo}</p>
            <p className="text-lprose text-muted-foreground">{i.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Un plan según tu operación." — los tres planes.
 *
 * ═══ LOS PRECIOS APROBADOS SE MUESTRAN; LOS QUE NO EXISTEN, NO (CU-868kxar6m) ═══
 *
 * Esta nota decía "NO HAY PRECIOS, Y NO ES UN OLVIDO": *"inventar cifras en la página de precios
 * de un producto financiero sería lo peor que se podría hacer acá — un número que nadie aprobó,
 * en la pantalla donde el cliente decide si puede pagarlo."* Ese razonamiento **no se revierte,
 * se cumple**: Jose, que es quien aprueba el precio, dio dos cifras concretas el 2026-08-26
 * (Base $59 + IVA, Pro $139 + IVA). Lo que la nota prohibía era el placeholder, no el precio.
 *
 * Por eso `precio` es OPCIONAL en el diccionario y no obligatorio: "Personalizado" se cotiza, y
 * un campo requerido obligaría a inventarle una cifra — exactamente lo que la nota impide. Su
 * tarjeta se queda sin línea de precio, no con un "a convenir" que ocupe el mismo lugar y no
 * diga nada.
 *
 * Los tres siguen llevando el MISMO CTA y no un botón de compra: no hay checkout, así que la
 * conversión de esta sección sigue siendo la conversación.
 *
 * ═══ COLUMNAS CON DIVISOR, NO TARJETAS ═══
 *
 * Los tenía como tres tarjetas con borde y fondo. En el diseño no hay tarjeta: son tres columnas
 * separadas por una línea vertical, sobre la banda gris. La diferencia importa porque una tarjeta
 * con fondo propio sobre una banda gris crea un segundo nivel de superficie que en el resto de la
 * página significa "esto es un dato del producto" (las tarjetas de mockup). Un plan no lo es.
 *
 * ═══ EL DEL MEDIO LLEVA EL BOTÓN LLENO ═══
 *
 * Es el plan que el diseño destaca, y se marca por POSICIÓN porque así está en el Figma: el del
 * medio tiene el botón oscuro y los otros dos el contorno. Va por índice y no por una bandera en
 * el diccionario a propósito — una bandera invitaría a marcar dos, y dos planes destacados es
 * ninguno.
 */
export function SeccionPlanes({ labels, hrefDemo }: { labels: L; hrefDemo?: string }) {
  const t = labels.planes;
  const destacado = Math.floor(t.items.length / 2);

  return (
    <div className="flex flex-col gap-14">
      <EncabezadoPartido eyebrow={t.eyebrow} title={t.title} subtitle={t.nota} ancho="16ch" />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-0">
        {t.items.map((p, i) => (
          <div
            key={p.nombre}
            className="flex flex-col gap-5 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:px-8 lg:pt-0 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-[24px] font-normal leading-tight tracking-[-0.02em] text-foreground">
                {p.nombre}
              </h3>
              {/*
                El precio va DEBAJO del nombre y ARRIBA de la descripción: es lo segundo que
                alguien busca en una página de planes, después de saber cuál es cuál. Ponerlo al
                final, junto al botón, obligaría a leer la lista entera para saber si el plan
                está en su presupuesto.

                `tabular-nums` porque son tres columnas alineadas y las cifras tienen que caer
                una debajo de la otra. Y en la tipografía de interfaz, no en mono: es una cifra
                de portada, y la regla del producto es que las cifras grandes no van monoespaciadas.
              */}
              {p.precio && (
                <p className="text-[20px] font-medium leading-tight tabular-nums text-foreground">
                  {p.precio}
                </p>
              )}
              <p className="text-lprose text-muted-foreground">{p.para}</p>
            </div>

            <ul className="flex flex-1 flex-col gap-2.5 border-t border-border pt-5">
              {p.incluye.map((f) => (
                <li key={f} className="flex gap-2.5 text-lprose text-foreground">
                  {/* El punto de marca como viñeta. Decorativo, y el propio componente lo pone
                      `aria-hidden`: el lector de pantalla ya anuncia los items de la lista. */}
                  <InsightPoint size="sm" className="mt-1 h-1.5 w-1.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={hrefDemo ?? ANCLA_DEMO}
              className={
                i === destacado
                  ? 'inline-flex items-center justify-center self-start rounded-md bg-primary px-5 py-2.5 text-lstrong text-primary-foreground transition-opacity hover:opacity-90'
                  : 'inline-flex items-center justify-center self-start rounded-md border border-border bg-canvas px-5 py-2.5 text-lstrong text-foreground transition-colors hover:bg-muted'
              }
            >
              {t.cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
