import { Suspense } from 'react';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { ChatClient } from '@/components/chat/chat-client';

/**
 * CU-868kfvac2: interfaz de chat CFO. `middleware.ts` ya exige sesión.
 *
 * ═══ CU-868krvtya: EL CHAT SALE DEL "FRAME" ═══
 *
 * Esta página era como cualquier otra del producto: un `<main>` con padding, un eyebrow, un
 * `<h1>` y debajo una tarjeta de **560px de alto fijo** con la conversación adentro. O sea
 * una caja flotando en una página — que es exactamente lo que Macha llamó "el frame".
 *
 * El problema no es estético. Con alto fijo, la conversación tiene su propio scroll dentro
 * de un scroll, el área de lectura no crece aunque sobre pantalla, y el título ocupa el
 * espacio vertical que debería ser conversación. En una herramienta donde se lee y se
 * escribe todo el rato, eso se nota en cada mensaje.
 *
 * Ahora la página **es** la conversación: sin padding propio, sin título, y a la altura
 * completa del shell.
 *
 * `flex-1 min-h-0` y no `h-full`, y la diferencia importa: el contenedor del shell resuelve
 * su alto desde un `min-height` sobre el grid, y `height: 100%` contra eso es justo el caso
 * donde un navegador puede no darle altura definida y dejar la pantalla colapsada al alto
 * del contenido. Con `flex-1` el alto lo reparte el contenedor —que desde este ticket es
 * una columna flex— y no hay porcentaje que resolver. `min-h-0` es lo que permite que el
 * área de lectura scrollee ADENTRO en vez de empujar al padre y sacar el composer de la
 * pantalla: sin él, un hijo flex no puede encogerse por debajo de su contenido.
 *
 * El eyebrow y el `<h1>` desaparecen a propósito: la navegación ya dice dónde estás, y en
 * las herramientas de conversación que el prototipo toma de referencia el encabezado es
 * justamente lo que no está. El nombre accesible de la región lo da el `aria-label`.
 */
export default function ChatPage() {
  const locale = getLocale();
  const t = getDictionary(locale);

  return (
    <main data-density="compact" aria-label={t.chat.title} className="flex min-h-0 flex-1 flex-col">
      {/* ChatClient lee ?thread= con useSearchParams() (deep-link desde reportes,
          CU-868kfvacr) — Next.js exige un límite de Suspense alrededor de eso. */}
      <Suspense fallback={null}>
        <ChatClient locale={locale} labels={t.chat} common={t.common} />
      </Suspense>
    </main>
  );
}
