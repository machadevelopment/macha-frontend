'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessagesSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LoadError } from '@/components/ui/load-error';
import { MarkdownMessage } from '@/components/chat/markdown-message';
import { ChatWelcome } from '@/components/chat/chat-welcome';
import { request, requestJson, type RequestError } from '@/lib/api/browser';
import type { Dictionary } from '@/lib/i18n/dictionary';
import { formatDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/config';

interface ChatThread {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: string;
}

export function ChatClient({
  locale,
  labels,
  common,
}: {
  locale: Locale;
  labels: Dictionary['chat'];
  common: Dictionary['common'];
}) {
  const searchParams = useSearchParams();
  const requestedThread = searchParams.get('thread');
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(requestedThread);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  /** Fallo cargando hilos/mensajes: reemplaza la pantalla. */
  const [loadError, setLoadError] = useState<RequestError | null>(null);
  /** Fallo enviando o creando: va junto al input, sin tapar la conversación. */
  const [sendError, setSendError] = useState<RequestError | null>(null);
  /** Hilos creados en esta sesión, cuyos mensajes NO hay que ir a buscar (ver el efecto). */
  const hilosNuevos = useRef<Set<string>>(new Set());
  /** Drawer de conversaciones, solo bajo 1080px (CU-868krvtya). */
  const [hilosAbiertos, setHilosAbiertos] = useState(false);
  const finDeLaConversacion = useRef<HTMLDivElement>(null);

  /*
   * CU-868krvtya: la conversación se queda abajo.
   *
   * Con la tarjeta de alto fijo esto no hacía falta porque casi nada desbordaba. Ahora el
   * área de lectura ocupa toda la pantalla, así que sin esto la respuesta del asesor
   * aparece FUERA de la vista y el usuario cree que no pasó nada — el mismo síntoma que el
   * bug del asesor mudo, pero de maquetación.
   *
   * `sending` está en las dependencias además de `messages` para que el aviso de "está
   * pensando" también arrastre la vista: es lo que confirma que el envío salió.
   */
  useEffect(() => {
    finDeLaConversacion.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, sending]);

  // CU-868kkgb3c: los tres fetch de esta pantalla iban sin manejo de fallo.
  useEffect(() => {
    void request<ChatThread[]>('/api/chats').then((result) => {
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setThreads(result.data);
      // Deep-link from a report (?thread=<id>, CU-868kfvacr) wins over the default
      // "select the most recent thread" behavior.
      if (!requestedThread && result.data[0]) setActiveId(result.data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    /**
     * CU-868knx189: un hilo que acabamos de crear en esta misma sesión no se pide al
     * backend. No es un ahorro de request — es una condición de carrera real. Una
     * pregunta rápida crea el hilo y encola el mensaje optimista del usuario en la misma
     * continuación; este efecto corre DESPUÉS, y su respuesta (una lista vacía, porque el
     * hilo es nuevo) llegaría a pisar ese mensaje, dejando la pregunta invisible mientras
     * el asesor la contesta.
     *
     * La marca se consume una sola vez: si el usuario se va a otro hilo y vuelve, este
     * efecto ya sí trae los mensajes del servidor.
     */
    if (hilosNuevos.current.has(activeId)) {
      hilosNuevos.current.delete(activeId);
      return;
    }
    void request<ChatMessage[]>(`/api/chats/${activeId}/messages`).then((result) => {
      if (result.ok) setMessages(result.data);
      else setLoadError(result.error);
    });
  }, [activeId]);

  /** Devuelve el id del hilo creado, o `null` si falló: `send()` lo necesita para postear. */
  async function createChat(): Promise<string | null> {
    const result = await requestJson<{ id: string; title: string }>('/api/chats', 'POST', {});
    if (!result.ok) {
      // Antes un fallo acá lanzaba dentro del onClick: ni hilo nuevo ni aviso.
      setSendError(result.error);
      return null;
    }
    const chat = result.data;
    setThreads((prev) => [
      { id: chat.id, title: chat.title, updatedAt: new Date().toISOString() },
      ...(prev ?? []),
    ]);
    // Limpiar acá y no en el efecto: el efecto se saltea para hilos nuevos (ver arriba),
    // así que sin esto el hilo recién creado heredaría en pantalla la conversación del
    // anterior.
    setMessages([]);
    hilosNuevos.current.add(chat.id);
    setActiveId(chat.id);
    return chat.id;
  }

  /**
   * `texto` viene de las preguntas rápidas del estado vacío (CU-868knx189); sin argumento
   * se envía el borrador del input, que es el camino de siempre.
   */
  async function send(texto?: string) {
    const content = (texto ?? draft).trim();
    if (!content || sending) return;

    /*
     * Una pregunta rápida puede dispararse SIN hilo abierto: es justo el caso del usuario
     * que entra por primera vez y todavía no tocó "Nuevo chat". Se crea al vuelo, porque
     * obligarlo a crear el hilo primero convierte la tarjeta en un botón que no hace nada.
     */
    const threadId = activeId ?? (await createChat());
    if (!threadId) return;

    setDraft('');
    setSendError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    try {
      const result = await requestJson<{ content: string; title: string }>(
        `/api/chats/${threadId}/messages`,
        'POST',
        { content },
      );
      if (!result.ok) {
        /**
         * CU-868kkgb3c: antes, si esto fallaba, el mensaje del usuario se quedaba en
         * pantalla sin respuesta y sin error — indistinguible de un modelo que tarda.
         * El usuario esperaba una respuesta que no iba a llegar nunca.
         *
         * Se retira el mensaje optimista y se devuelve el texto al input: es lo único
         * que evita que alguien crea que su pregunta quedó registrada. El backend pudo
         * no haberla persistido.
         */
        setMessages((prev) => prev.slice(0, -1));
        setDraft(content);
        setSendError(result.error);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.data.content, createdAt: new Date().toISOString() },
      ]);

      /*
       * CU-868krkw4p: el backend nombra el hilo con la primera pregunta, y devuelve el
       * título efectivo en esta misma respuesta. Se sincroniza acá y no con un refetch de
       * `/api/chats` por dos razones: una petición menos en el camino más caliente, y
       * sobre todo porque un refetch pisaría el orden de la lista mientras el usuario la
       * está mirando.
       *
       * La asignación es incondicional a propósito — el backend manda el título tal cual
       * quedó, cambie o no, así que acá no hay que decidir nada. Y `title` va aparte de
       * `updatedAt`: reordenar la lista en cada mensaje movería el hilo activo bajo el
       * cursor, que es otro problema y no el de este ticket.
       */
      // `prev` es null mientras la lista no cargó. Se deja como está en vez de inventar un
      // arreglo de un elemento: la carga en curso lo pisaría igual, y un hilo suelto en la
      // lista mientras el resto llega se ve como un parpadeo.
      setThreads((prev) =>
        prev ? prev.map((t) => (t.id === threadId ? { ...t, title: result.data.title } : t)) : prev,
      );
    } finally {
      setSending(false);
    }
  }

  // CU-868kkgb3c: si no se pudieron cargar los hilos no hay chat que mostrar. Antes esto
  // renderizaba el panel vacío con el input habilitado, invitando a escribir en un hilo
  // que no existía.
  if (loadError) {
    return (
      <LoadError error={loadError} labels={common.loadError} onRetry={() => location.reload()} />
    );
  }

  /** Lista de hilos. Se monta dos veces —riel en escritorio, drawer en móvil— y se escribe una. */
  const listaDeHilos = (
    <div className="flex min-h-0 flex-col gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void createChat()}>
        <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
        {labels.newChat}
      </Button>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {threads?.length === 0 && <p className="px-2 text-body text-faint">{labels.noThreads}</p>}
        {threads?.map((thread) => (
          <button
            key={thread.id}
            onClick={() => {
              setActiveId(thread.id);
              setHilosAbiertos(false);
            }}
            className={`rounded-md px-2 py-1.5 text-left text-body ${
              thread.id === activeId ? 'bg-muted' : 'hover:bg-muted'
            }`}
          >
            {/* `truncate` y `title`: los hilos se nombran solos con la primera pregunta
                (CU-868krkw4p), así que hay títulos largos y sin él rompían el riel. */}
            <span className="block truncate" title={thread.title}>
              {thread.title}
            </span>
            <span className="block font-mono text-eyebrow text-faint">
              {formatDate(thread.updatedAt, locale)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/*
        Riel de conversaciones. Bajo 1080px pasa al drawer de abajo, igual que la navegación
        del shell: dos columnas de lista sobre un teléfono no dejan ancho para leer.
      */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-border p-3 app:flex">
        <p className="mb-2 px-2 font-mono text-eyebrow uppercase text-faint">{labels.threads}</p>
        {listaDeHilos}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Barra de solo-móvil con el acceso a los hilos. En escritorio no existe: el riel
            de la izquierda ya está siempre visible y una barra más solo restaría alto. */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 app:hidden">
          <Sheet open={hilosAbiertos} onOpenChange={setHilosAbiertos}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <MessagesSquare className="h-3.5 w-3.5" strokeWidth={1.7} />
                {labels.threads}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" closeLabel={common.close} className="flex flex-col p-3">
              <SheetTitle className="mb-2 px-2 font-mono text-eyebrow uppercase text-faint">
                {labels.threads}
              </SheetTitle>
              {listaDeHilos}
            </SheetContent>
          </Sheet>
        </div>

        {/*
          ÁREA DE LECTURA. `min-h-0` es lo que hace que scrollee acá adentro en vez de
          empujar al padre y sacar el composer de la pantalla — sin él, `flex-1` no puede
          encogerse por debajo del alto de su contenido.
        */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {/*
            Columna centrada y acotada. El ancho no es decorativo: una línea de texto de más
            de ~75 caracteres se vuelve incómoda de leer porque el ojo pierde el renglón al
            volver. Que la conversación NO ocupe los 1400px del shell es justamente lo que la
            hace parecer una herramienta de lectura y no una tabla.
          */}
          <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-4">
            {messages.length === 0 && (
              <ChatWelcome labels={labels.welcome} onAsk={(q) => void send(q)} disabled={sending} />
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] self-end rounded-md bg-primary px-3 py-2 text-body text-primary-foreground'
                    : /*
                       * La respuesta del asesor va a ANCHO COMPLETO y sin burbuja.
                       *
                       * Antes era una burbuja gris al 90%. Su contenido ya no es una línea de
                       * texto —lleva listas y tablas (CU-868knx181)— y una tabla dentro de una
                       * burbuja al 90% entra en scroll horizontal aunque sobre espacio al lado.
                       * Sin caja, el texto usa la columna entera y se lee como un documento,
                       * que es lo que la referencia del prototipo hace. La burbuja se queda
                       * solo del lado del usuario, donde sí distingue quién habla.
                       */
                      'max-w-full text-body'
                }
              >
                {/*
                  CU-868knx181: solo el asesor se renderiza como Markdown. Lo que escribe el
                  usuario se pinta tal cual — si alguien pregunta por un SKU llamado `*ABC*`
                  no hay razón para que la app se lo coma y le muestre `ABC` en cursiva.
                  `role === 'tool'` (que el esquema admite aunque hoy no se persista) tampoco
                  pasa por Markdown: es salida de herramienta, no prosa.
                */}
                {m.role === 'assistant' ? <MarkdownMessage content={m.content} /> : m.content}
              </div>
            ))}

            {/* Que el asesor está trabajando, en la conversación y no solo en el botón: con
                el composer abajo del todo, un rótulo que cambia allá se sale del punto donde
                el usuario está mirando después de mandar. */}
            {sending && <p className="text-body text-faint">{labels.thinking}</p>}

            {/* Ancla del auto-scroll. Ver el efecto de arriba. */}
            <div ref={finDeLaConversacion} />
          </div>
        </div>

        {/* COMPOSER anclado abajo, alineado con la columna de lectura. */}
        <div className="border-t border-border px-3 py-3">
          <div className="mx-auto w-full max-w-[46rem]">
            {sendError && (
              <div className="mb-2">
                <LoadError error={sendError} labels={common.loadError} />
              </div>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  /*
                   * Enter envía, Mayús+Enter salta de línea — lo que hace cualquier
                   * herramienta de conversación, y lo que antes era imposible: el campo era
                   * un `<input>` de una línea, así que preguntar algo de dos renglones no
                   * tenía forma.
                   *
                   * `isComposing` NO es un detalle: con un teclado de composición (acentos
                   * en algunos IME, japonés, chino) el Enter que CONFIRMA la palabra
                   * dispararía el envío a mitad de la frase.
                   */
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={labels.placeholder}
                rows={1}
                // Crece con el texto hasta ~8 renglones y de ahí scrollea: sin tope, pegar
                // un texto largo empujaría la conversación entera fuera de la pantalla.
                className="max-h-[12rem] min-h-[2.5rem] resize-none"
                /*
                 * Ya no se exige un hilo abierto para escribir. `send()` lo crea al vuelo,
                 * así que la condición vieja (`!activeId`) dejaba el campo muerto justo para
                 * el usuario que entra por primera vez — y habría sido incoherente que las
                 * preguntas rápidas funcionaran y la caja de al lado no.
                 */
                disabled={sending}
              />
              <Button onClick={() => void send()} disabled={sending}>
                {sending ? labels.sending : labels.send}
              </Button>
            </div>
            <p className="mt-1.5 text-eyebrow text-faint">{labels.composerHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
