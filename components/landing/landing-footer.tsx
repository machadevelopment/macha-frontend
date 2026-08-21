import Link from 'next/link';
import { MachaMark } from '@/components/ui/macha-mark';
import { CORREO_DEMO } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Pie de la landing.
 *
 * ═══ LAS LEGALES SE NOMBRAN PERO NO SE ENLAZAN A NINGUNA PARTE ═══
 *
 * El diseño lista "Aviso de privacidad", "Términos" y "Política de datos". **Esos documentos no
 * existen todavía**, así que se pintan como TEXTO y no como enlaces.
 *
 * Es deliberado y no un olvido: un `<a href="#">` que no lleva a nada, en un producto que maneja
 * datos financieros de terceros, es peor que no tener el enlace. Quien lo aprieta buscando saber
 * qué hacemos con sus datos y no llega a nada aprende algo sobre nosotros — y no es lo que
 * queremos que aprenda. Cuando los documentos existan, se cambian por `<Link>` y listo.
 *
 * Las redes del diseño (LinkedIn, Instagram, YouTube, Facebook) tampoco están: no tengo las URL.
 * Mismo criterio — cuando lleguen, entran.
 *
 * El correo SÍ es un enlace real: es el único contacto que funciona hoy.
 */
export function LandingFooter({ labels }: { labels: Dictionary['landing'] }) {
  const legales = [labels.footer.privacidad, labels.footer.terminos, labels.footer.datos];

  return (
    <footer className="mt-24 border-t border-border pt-10">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
          >
            <MachaMark />
            Macha
          </Link>
          <p className="text-[15px] font-light text-muted-foreground">{labels.footer.tagline}</p>
          <a
            href={`mailto:${CORREO_DEMO}`}
            className="text-[15px] text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            {labels.footer.email}
          </a>
        </div>

        {/*
          Las legales, como texto. Ver la nota de arriba: un enlace que no lleva a la política de
          datos es peor que su ausencia en un producto que maneja la contabilidad de un cliente.
        */}
        <ul className="flex flex-col gap-1.5">
          {legales.map((t) => (
            <li key={t} className="text-[15px] font-light text-faint">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-10 font-mono text-eyebrow text-faint">{labels.footer.copyright}</p>
    </footer>
  );
}
