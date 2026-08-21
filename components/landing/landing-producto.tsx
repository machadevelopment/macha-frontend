import Image from 'next/image';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * "Todo tu negocio en una sola vista." — el segundo mockup.
 *
 * Las pestañas del diseño (Costos, Flujo de caja) se pintan como ETIQUETAS, no como pestañas
 * funcionales: solo existe la captura de "Ventas del mes". Unas pestañas que no cambian nada al
 * apretarlas son peor que ninguna — prometen una interacción que no está. Cuando haya capturas de
 * las otras vistas, se vuelven pestañas de verdad.
 *
 * Mismo criterio que el mockup del hero: PNG a 2x por `next/image`, sin `priority` porque esta
 * sección está bien abajo y cargarla de entrada retrasaría la primera pantalla.
 */
export function SeccionProducto({ labels }: { labels: Dictionary['landing'] }) {
  const t = labels.producto;
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4">
          <p className="text-leyebrow uppercase text-muted-foreground">{t.eyebrow}</p>
          <h2 className="max-w-[20ch] text-section text-foreground">{t.title}</h2>
        </div>
        <p className="max-w-[52ch] text-lsub text-muted-foreground">{t.subtitle}</p>
      </div>

      {/*
        Etiquetas, no pestañas: ver la nota de arriba. `aria-hidden` porque no aportan información
        a quien no ve la imagen — describen vistas que el mockup NO muestra.

        La primera va subrayada y en tinta plena porque es la que la captura está mostrando. Sin
        esa marca, cinco etiquetas iguales sobre una sola imagen se leen como cinco cosas que la
        imagen contiene, cuando el mockup es solo la primera.
      */}
      <ul aria-hidden className="flex flex-wrap gap-7 border-b border-border">
        {t.pestanas.map((p, i) => (
          <li
            key={p}
            className={
              i === 0
                ? '-mb-px border-b border-foreground pb-3 text-[18px] font-semibold text-foreground'
                : 'pb-3 text-[18px] font-light text-faint'
            }
          >
            {p}
          </li>
        ))}
      </ul>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Image
          src="/landing/mockup-ventas.png"
          alt={t.mockupAlt}
          width={1316}
          height={628}
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
