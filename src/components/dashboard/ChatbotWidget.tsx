'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, TrendingUp, CalendarDays, BarChart3, LineChart } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  ts: number;
}

const INITIAL_SUGGESTIONS = [
  { label: 'Upcoming IPOs', icon: CalendarDays },
  { label: 'Top gainers today', icon: TrendingUp },
  { label: 'Explain NIFTY', icon: BarChart3 },
  { label: 'Earnings this week', icon: LineChart },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [
    { role: 'bot', text: 'Hi! I\'m your **Stock Assistant**. Ask me about NSE/BSE stocks, IPOs, earnings, or market terms.', ts: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMsg = { role: 'user', text: trimmed, ts: Date.now() };
    const botMsg: ChatMsg = { role: 'bot', text: '', ts: Date.now() };

    setMsgs(prev => [...prev, userMsg, botMsg]);
    setInput('');
    setLoading(true);
    setStreamingId(msgs.length + 1);

    const history = [...msgs.slice(-10), userMsg].map(m => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const ct = res.headers.get('Content-Type') || '';

      if (ct.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let reply = '';
        let firstToken = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  reply += parsed.token;
                  if (firstToken) {
                    setLoading(false);
                    firstToken = false;
                  }
                  const idx = msgs.length + 1;
                  setStreamingId(idx);
                  setMsgs(prev => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                      updated[updated.length - 1] = { role: 'bot', text: reply, ts: Date.now() };
                    }
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }

        if (firstToken) setLoading(false);
      } else {
        const data = await res.json();
        setMsgs(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = { role: 'bot', text: data.text || 'No response', ts: Date.now() };
          }
          return updated;
        });
        setLoading(false);
      }
    } catch {
      setMsgs(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { role: 'bot', text: 'Sorry, I couldn\'t reach the server. Please try again.', ts: Date.now() };
        }
        return updated;
      });
      setLoading(false);
    }

    setStreamingId(null);
  }, [msgs]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  return (
    <>
      {/* ── Floating icon ── */}
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-95"
        aria-label="Open stock assistant"
      >
        <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:rotate-[-8deg]" />
      </button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
            className="fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-white/[0.08] bg-[#0f1729] shadow-2xl shadow-black/60"
            style={{ maxHeight: 'min(600px, calc(100vh - 120px))' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between rounded-t-2xl border-b border-white/[0.06] bg-gradient-to-r from-cyan-500/10 to-blue-500/5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-400/20">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Stock Assistant</h2>
                  <p className="text-[10px] text-slate-500">AI-powered market insights</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Messages ── */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ maxHeight: '360px' }}>
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-white shadow-sm shadow-cyan-500/5'
                        : 'bg-white/[0.06] text-slate-200'
                    }`}
                  >
                    {m.role === 'bot' && streamingId === i && m.text === '' ? (
                      <span className="flex gap-0.5 py-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </span>
                    ) : (
                      <RenderText text={m.text} />
                    )}
                  </div>
                </motion.div>
              ))}

              {/* ── Quick suggestions (first message only) ── */}
              {msgs.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {INITIAL_SUGGESTIONS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => send(s.label)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300"
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Input ── */}
            <div className="border-t border-white/[0.06] px-4 py-3">
              <form
                onSubmit={e => { e.preventDefault(); send(input); }}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 transition focus-within:border-cyan-500/40 focus-within:shadow-sm focus-within:shadow-cyan-500/5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about stocks, IPOs, market news…"
                  disabled={loading}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-blue-500"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini markdown renderer (bold only)                                 */
/* ------------------------------------------------------------------ */

function RenderText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}
