'use client';

import { UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
 */
export function DashboardGreeting({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Dictionary['dashboard'];
}) {
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

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-eyebrow uppercase text-faint">{fecha}</p>
        <h1 className="mt-1 text-h1">{saludo}</h1>
        <p className="mt-1 text-body text-muted-foreground">{labels.greetingSubtitle}</p>
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
