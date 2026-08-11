'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadError } from '@/components/ui/load-error';
import { MarkdownMessage } from '@/components/chat/markdown-message';
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
    void request<ChatMessage[]>(`/api/chats/${activeId}/messages`).then((result) => {
      if (result.ok) setMessages(result.data);
      else setLoadError(result.error);
    });
  }, [activeId]);

  async function createChat() {
    const result = await requestJson<{ id: string; title: string }>('/api/chats', 'POST', {});
    if (!result.ok) {
      // Antes un fallo acá lanzaba dentro del onClick: ni hilo nuevo ni aviso.
      setSendError(result.error);
      return;
    }
    const chat = result.data;
    setThreads((prev) => [
      { id: chat.id, title: chat.title, updatedAt: new Date().toISOString() },
      ...(prev ?? []),
    ]);
    setActiveId(chat.id);
  }

  async function send() {
    const content = draft.trim();
    if (!content || !activeId) return;
    setDraft('');
    setSendError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    try {
      const result = await requestJson<{ content: string }>(
        `/api/chats/${activeId}/messages`,
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

  return (
    <div className="grid grid-cols-1 gap-4 app:grid-cols-[212px_1fr]">
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={createChat}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
          {labels.newChat}
        </Button>
        <div className="flex flex-col gap-1">
          {threads?.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveId(thread.id)}
              className={`rounded-md px-2 py-1.5 text-left text-body ${
                thread.id === activeId ? 'bg-muted' : 'hover:bg-muted'
              }`}
            >
              {thread.title}
              <span className="block font-mono text-eyebrow text-faint">
                {formatDate(thread.updatedAt, locale)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card className="flex h-[560px] flex-col justify-between">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-body text-muted-foreground">{labels.empty}</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user'
                  ? 'max-w-[80%] self-end rounded-md bg-primary px-3 py-2 text-body text-primary-foreground'
                  : // La burbuja del asesor va más ancha que la del usuario (90% vs 80%)
                    // porque su contenido ya no es una línea de texto: lleva listas y
                    // tablas, y a 80% una tabla de cuatro columnas entra directo en
                    // scroll horizontal aunque hubiera espacio de sobra al lado.
                    'max-w-[90%] self-start rounded-md bg-muted px-3 py-2 text-body'
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
        </div>
        {sendError && <LoadError error={sendError} labels={common.loadError} />}
        <div className="mt-3 flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !sending && send()}
            placeholder={labels.placeholder}
            disabled={!activeId || sending}
          />
          <Button onClick={send} disabled={!activeId || sending}>
            {sending ? labels.sending : labels.send}
          </Button>
        </div>
      </Card>
    </div>
  );
}
