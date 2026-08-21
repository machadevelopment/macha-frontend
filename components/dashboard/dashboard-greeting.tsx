'use client';

import { UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InsightPoint } from '@/components/ui/insight-point';
import { usePeriodScope } from '@/components/dashboard/period-scope';
import type { Dictionary } from '@/lib/i18n/dictionary';
import type { Locale } from '@/lib/i18n/config';

/**
 * Cabecera del dashboard con el saludo del prototipo: fecha, saludo según la hora,
 * una línea de contexto y el acceso directo a subir Excel.
 *
 * Es un componente de CLIENTE porque el saludo depende de la hora del USUARIO. Calculado
 * en el servidor saldría con la hora del servidor —UTC en Railway— y a un cliente en
 * Guatemala (UTC-6) le diría "buenas noches" a media tarde. Es el tipo de detalle que
 * hace que un producto se sienta ajeno.
 *
 * La fecha se formatea con `Intl` vía el locale de la app y no con una plantilla propia:
 * el orden de día y mes cambia entre es-GT y en-US.
 *
 * CU-868krkqh2 — EL SUBTÍTULO SIGUE AL PERÍODO. Antes era la constante
 * `greetingSubtitle: 'Así va tu negocio este mes.'`, así que al pasar el filtro a "Este año"
 * el saludo seguía afirmando "este mes" sobre cifras anuales. No era un texto desactualizado:
 * era la pantalla contradiciéndose consigo misma dos líneas más abajo, donde la línea de
 * "Mostrando" sí decía el rango correcto.
 *
 * La frase se arma por interpolación de `{period}` y no concatenando trozos: en inglés el
 * período va al final ("...doing this year") y en español también, pero un rango
 * personalizado necesita preposición ("en el rango elegido" / "in the selected range") y eso
 * no sale de pegar palabras sueltas.
 */
export function DashboardGreeting({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
}) {
  const { periodo } = usePeriodScope();
  const ahora = new Date();
  const hora = ahora.getHours();
  const saludo =
    hora < 12
      ? labels.greetingMorning
      : hora < 19
        ? labels.greetingAfternoon
        : labels.greetingEvening;

  const fecha = new Intl.DateTimeFormat(locale === 'es' ? 'es-GT' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(ahora);

  const subtitulo = labels.greetingSubtitle.replace('{period}', labels.greetingPeriod[periodo]);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-eyebrow uppercase text-faint">{fecha}</p>
        {/*
          ═══ CU-868ktknbq · AHORA `pagetitle`, Y ESTO REVISA UNA DECISIÓN ANTERIOR ═══

          Antes: `text-h1 font-normal` — 27px con peso 400. Venía de CU-868kt8bg0, donde el
          equipo pidió EXPLÍCITAMENTE peso normal con este argumento, que sigue siendo bueno:
          "Buenos días" es una cortesía, no un dato, y en negrilla compite con las cifras.

          Lo que ese ticket no resolvió es el TAMAÑO, y ahí estaba el problema: 27px con peso
          400 es más grande y más delgado a la vez que el prototipo (24px/600), así que ocupaba
          más espacio y mandaba menos. La jerarquía del prototipo sale del PESO a un tamaño
          menor; la nuestra la buscaba en el tamaño y después le quitaba el peso.

          `pagetitle` (20px/600) no es un token nuevo: se creó en ese MISMO ticket con la nota
          de que `h1` "sigue siendo el titular de las pantallas de VITRINA" y que "una pantalla
          de producto — dashboard, analítica, reportes — ya no lo usa". El panel simplemente se
          quedó sin migrar. Esto lo termina.

          Se vuelve al peso 600 y por eso se contradice a medias el pedido del equipo. El
          argumento de fondo se respeta igual: a 20px/600 el saludo pesa MENOS que a 27px/400
          y compite mucho menos con los KPIs, que es lo que se quería evitar. Si se prefiere
          calcar el prototipo al pixel son 24px/600 y hace falta un token; si se prefiere el
          peso normal de vuelta, es agregar `font-normal` acá.
        */}
        {/*
          ═══ EL ACENTO DE MARCA VA ACÁ Y NO DE FONDO (2026-08-20, pedido de Jose) ═══

          Jose pidió "el favicon o el isotipo verde en el Dashboard para darle más vida". Se usa
          `InsightPoint` en modo `figure` —el componente que ya existe— y NO como atmósfera
          detrás del contenido, por una regla que ese mismo componente lleva escrita: el salvia
          **nunca** va detrás de una tabla o una gráfica, porque compite con el verde funcional
          de las series y los deltas y hace dudar de si el color pertenece al dato.

          Junto al título es justo donde el Brand Book pone este recurso: como acento del
          titular de sección. El Dashboard ya lo usaba dentro del Consejo Financiero Diario,
          pero no en la cabecera, que es el lugar del manual.

          `sm` (24px) y no `md` (36px): al lado de un titular de 20px, un punto de 36 no es un
          acento, es el elemento principal. Y va SIN ícono a propósito — dentro del Consejo el
          ícono dice "esto lo escribió el asesor"; acá el punto no anuncia nada, es la marca.

          Sin `label`, así que el componente lo marca `aria-hidden`: es decoración, y anunciarlo
          le agregaría ruido a un lector de pantalla antes del saludo.
        */}
        <div className="mt-1 flex items-center gap-2">
          <InsightPoint size="sm" />
          <h1 className="text-pagetitle">{saludo}</h1>
        </div>
        <p className="mt-1 text-body text-muted-foreground">{subtitulo}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/upload">
          <UploadCloud className="mr-2 h-4 w-4" strokeWidth={1.7} />
          {labels.importCta}
        </Link>
      </Button>
    </div>
  );
}
