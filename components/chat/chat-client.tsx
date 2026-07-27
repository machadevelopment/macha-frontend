'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

export function ChatClient({ locale, labels }: { locale: Locale; labels: Dictionary['chat'] }) {
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/chats')
      .then((r) => r.json())
      .then((data: ChatThread[]) => {
        setThreads(data);
        if (data[0]) setActiveId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    fetch(`/api/chats/${activeId}/messages`)
      .then((r) => r.json())
      .then(setMessages);
  }, [activeId]);

  async function createChat() {
    const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({}) });
    const chat: { id: string; title: string } = await res.json();
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
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content, createdAt: new Date().toISOString() },
    ]);
    try {
      const res = await fetch(`/api/chats/${activeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const data: { content: string } = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-[212px_1fr] gap-4">
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
              className={`max-w-[80%] rounded-md px-3 py-2 text-body ${
                m.role === 'user'
                  ? 'self-end bg-primary text-primary-foreground'
                  : 'self-start bg-muted'
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
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
