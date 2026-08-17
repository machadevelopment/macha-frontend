'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DocumentDropzone } from '@/components/upload/document-dropzone';
import type { Dictionary } from '@/lib/i18n/dictionary';

/**
 * Paso de configuración de archivos del onboarding (CU-868krmrcj, fase C).
 *
 * ═══ QUÉ HACE Y QUÉ NO ═══
 *
 * Invita al cliente a subir su Excel ANTES de entrar al producto. Eso es todo — y es
 * suficiente, porque el aprendizaje ya no depende de esta pantalla: desde la fase B, TODA
 * carga guarda el perfil de columnas de la empresa (`lib/column-profile.ts` en el backend).
 * Esta pantalla no tiene lógica propia de análisis y no debería tenerla nunca; si la
 * tuviera, habría dos caminos que aprenden y solo uno se probaría.
 *
 * Lo que aporta es el MOMENTO. El perfil sirve desde la segunda carga en adelante, así que
 * cuanto antes exista, menos cargas se leen adivinando. Pedirlo acá —cuando la persona
 * acaba de dar de alta su empresa y está dispuesta a configurar— es cuando más barato es.
 *
 * ═══ POR QUÉ SE REUSA `DocumentDropzone` Y NO SE HACE UNO PROPIO ═══
 *
 * Es el mismo archivo que subiría después desde Carga de datos, con los mismos topes, los
 * mismos formatos y los mismos mensajes de rechazo del backend. Un dropzone propio para el
 * onboarding sería una segunda superficie donde los límites se pueden desincronizar, y el
 * cliente descubriría la diferencia con un archivo real.
 *
 * ═══ EL "OMITIR POR AHORA" NO ES UN ADORNO ═══
 *
 * El ticket lo pide para quien todavía no lleva sus finanzas en un Excel. Sin esa salida, el
 * onboarding se convierte en un muro para justo el cliente que más necesita entrar y mirar.
 *
 * ⚠️ ALCANCE ASUMIDO: el ticket quería que "Omitir" llevara a las PLANTILLAS descargables
 * por industria. Ese flujo NO existe todavía (no hay ticket abierto para él), así que acá
 * lleva a Carga de datos, que es el lugar real donde puede subirlo cuando lo tenga. Cuando
 * las plantillas existan, este es el único sitio que cambia.
 */
export function FileSetup({
  labels,
  uploadLabels,
  common,
}: {
  labels: Dictionary['onboarding'];
  uploadLabels: Dictionary['upload'];
  common: Dictionary['common'];
}) {
  const [subido, setSubido] = useState(false);

  /*
   * Un solo booleano y no una máquina de estados: el seguimiento del procesamiento ya vive
   * en Carga de datos y en el banner del dashboard, que son las pantallas que el cliente va
   * a mirar de verdad. Duplicarlo acá sería una tercera copia de la misma verdad.
   */
  if (subido) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6">
        {/* Verde FUNCIONAL, no salvia: esto dice "esto salió bien", que es estado, no
            identidad. La marca de esta pantalla la pone el sello de la vitrina. */}
        <span className="flex items-center gap-2 rounded-md border border-success-bd bg-success-bg px-2.5 py-1 text-body text-success">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.7} />
          {labels.uploadedTitle}
        </span>
        <p className="max-w-[60ch] text-body text-muted-foreground">{labels.uploadedBody}</p>
        <Button asChild>
          <Link href="/dashboard">{labels.goToDashboard}</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <DocumentDropzone
          labels={uploadLabels}
          common={common}
          onUploaded={() => setSubido(true)}
        />
      </Card>

      {/*
        Las tres razones van ANTES del "omitir" y después del dropzone: quien ya trae su
        archivo no las necesita —la acción está arriba— y quien duda es el que baja la
        vista. Ponerlas encima del dropzone empujaría la acción fuera de la primera pantalla.
      */}
      <Card className="flex flex-col gap-3 p-6">
        <p className="flex items-center gap-2 font-mono text-eyebrow uppercase text-faint">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.whyTitle}
        </p>
        <ul className="flex flex-col gap-2 text-body text-muted-foreground">
          {[labels.why1, labels.why2, labels.why3].map((razon) => (
            <li key={razon} className="flex gap-2">
              <span aria-hidden className="text-faint">
                ·
              </span>
              <span className="max-w-[64ch]">{razon}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-1.5">
        <Button asChild variant="ghost" className="self-start">
          <Link href="/upload">{labels.skip}</Link>
        </Button>
        <p className="max-w-[64ch] text-body text-faint">{labels.skipHint}</p>
      </div>
    </div>
  );
}
