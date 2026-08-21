import Link from 'next/link';
import { MachaMark } from '@/components/ui/macha-mark';
import { CORREO_DEMO, enlaceDemo } from '@/components/landing/demo-link';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * El footer de la landing: cuatro columnas y el copyright bajo una línea.
 *
 * ═══ LO QUE SE NOMBRA Y NO SE ENLAZA, Y POR QUÉ ═══
 *
 * Dos grupos de textos acá NO son enlaces, por el mismo motivo y a propósito:
 *
 * · Las LEGALES ("Aviso de privacidad", "Términos", "Política de datos"): esos documentos no
 *   existen todavía. Un `href="#"` en un producto que maneja la contabilidad de terceros le enseña
 *   algo a quien lo aprieta buscando qué hacemos con sus datos, y no es lo que queremos que
 *   aprenda. Hay test que lo fija.
 *
 * · Las REDES ("LinkedIn", "Instagram", "Youtube", "Facebook"): el diseño las lista, pero no trae
 *   ninguna URL y yo no sé si esas cuentas existen. Un enlace a un perfil equivocado —o a un
 *   perfil que alguien más ocupó con el nombre de la marca— es peor que el nombre suelto.
 *
 * En los dos casos el criterio es el mismo: el diseño pide que el nombre esté, no que lleve a
 * ninguna parte. Cuando existan el documento o la cuenta, se cambia por `<Link>` y se actualiza el
 * test. Lo que no puede pasar es que aparezca un enlace vacío en el camino.
 *
 * Los nombres de las redes NO son claves de i18n: son marcas, y "LinkedIn" se escribe igual en
 * los dos idiomas (design guide §7, la misma regla del wordmark).
 */

const REDES = ['LinkedIn', 'Instagram', 'Youtube', 'Facebook'];

export function LandingFooter({ labels }: { labels: Dictionary['landing'] }) {
  const f = labels.footer;
  const legales = [f.privacidad, f.terminos, f.datos];

  const navegacion: { texto: string; href: string }[] = [
    { texto: labels.nav.inicio, href: '#inicio' },
    { texto: labels.nav.comoFunciona, href: '#como-funciona' },
    { texto: labels.nav.planes, href: '#planes' },
    { texto: labels.nav.faq, href: '#faq' },
    { texto: labels.nav.contacto, href: enlaceDemo(labels.demoAsunto) },
  ];

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1170px] px-6 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-ui text-[17px] font-bold tracking-[-0.03em] text-foreground"
            >
              <MachaMark />
              Macha Finance
            </Link>
            <p className="max-w-[24ch] text-lprose text-faint">{f.tagline}</p>
          </div>

          <nav className="flex flex-col gap-3">
            {navegacion.map((n) => (
              <a
                key={n.texto}
                href={n.href}
                className="text-lprose text-muted-foreground transition-colors hover:text-foreground"
              >
                {n.texto}
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-3">
            {/* El correo SÍ es un enlace: es el único camino de conversión de la página y existe. */}
            <a
              href={enlaceDemo(labels.demoAsunto)}
              className="text-[15px] font-normal text-foreground transition-opacity hover:opacity-70"
            >
              {CORREO_DEMO}
            </a>
            {REDES.map((r) => (
              <span key={r} className="text-lprose text-muted-foreground">
                {r}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {legales.map((t) => (
              <span key={t} className="text-lprose text-faint">
                {t}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-16 border-t border-border pt-8 text-lsmall text-faint">{f.copyright}</p>
      </div>
    </footer>
  );
}
