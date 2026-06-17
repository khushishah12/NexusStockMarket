import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const yf = new YahooFinance();

/* ------------------------------------------------------------------ */
/*  Stop words                                                         */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  'A', 'AN', 'THE', 'IS', 'AT', 'TO', 'IN', 'OF', 'FOR', 'ON', 'BY', 'BE',
  'DO', 'GO', 'NO', 'SO', 'UP', 'US', 'WE', 'MY', 'ME', 'OR', 'AS', 'IF',
  'IT', 'HE', 'SHE', 'ARE', 'CAN', 'HOW', 'WHAT', 'WHY', 'WAS', 'WERE',
  'HAS', 'HAD', 'BUT', 'NOT', 'ALL', 'ANY', 'NEW', 'OLD', 'BIG', 'TOP',
  'OUT', 'NOW', 'GET', 'SEE', 'USE', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP',
  'OCT', 'NOV', 'DEC', 'PER', 'NET', 'LOW', 'HIGH', 'BID', 'ASK', 'BUY',
  'SELL', 'DUE', 'VIA', 'VS', 'INC', 'LTD', 'PVT', 'ROW', 'DID', 'PUT',
  'SET', 'SAY', 'WAY', 'YET', 'FAR', 'GOT', 'LET', 'OWN', 'TRY', 'TOO',
  'TWO', 'SIX', 'TEN', 'PDF', 'API', 'URL', 'APP', 'WEB', 'LOG',
  'TELL', 'GIVE', 'SHOW', 'LOOK', 'FIND', 'KNOW', 'NEED', 'WANT', 'LIKE',
  'PRICE', 'SHARE', 'LIVE', 'CURRENT', 'TODAY', 'YESTERDAY', 'TOMORROW',
  'STOCK', 'TRADE', 'TRADING', 'QUOTE', 'RATE', 'VALUE', 'COST',
  'MARKET', 'INDEX', 'BSE', 'NSE', 'NIFTY', 'SENSEX',
  'BANK', 'GOLD', 'SILVER', 'OIL', 'GAS', 'COAL', 'STEEL',
  'INFO', 'HELP', 'ABOUT', 'MORE', 'LESS', 'BEST', 'GOOD', 'BAD',
  'UP', 'DOWN', 'OPEN', 'CLOSE', 'CLOSED', 'OPENED',
  'DAY', 'WEEK', 'MONTH', 'YEAR', 'TODAYS', 'THIS', 'THAT',
  'WITH', 'FROM', 'THAN', 'THEN', 'ELSE', 'SOME', 'MANY', 'MUCH',
  'FIRST', 'LAST', 'NEXT', 'BACK', 'OVER', 'UNDER', 'BEFORE', 'AFTER',
  'JUST', 'ALSO', 'VERY', 'REAL', 'ONLY', 'EVEN', 'STILL', 'ALREADY',
  'BEEN', 'BEING', 'HAVE', 'HAS', 'HAD', 'DOES', 'DONE', 'DOING',
  'MAKE', 'MADE', 'TAKE', 'TOOK', 'GIVE', 'GAVE', 'COME', 'CAME',
  'SAY', 'SAID', 'GO', 'WENT', 'GONE', 'KNOW', 'KNEW', 'THINK',
  'THOUGHT', 'SEE', 'SAW', 'WANT', 'WANTED', 'YOUR', 'OUR', 'THEIR',
]);

/* ------------------------------------------------------------------ */
/*  RAG: search knowledge base                                        */
/* ------------------------------------------------------------------ */

async function searchKnowledge(query: string): Promise<string[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data } = await supabaseAdmin
      .from('knowledge_base')
      .select('content')
      .textSearch('content', query.replace(/[^a-zA-Z0-9\s]/g, ''), { type: 'plain' })
      .limit(3);

    if (data && data.length > 0) {
      return data.map((r: any) => r.content);
    }
  } catch {}
  return [];
}

/* ------------------------------------------------------------------ */
/*  Context builder                                                    */
/* ------------------------------------------------------------------ */

async function buildContext(message: string, origin: string): Promise<string> {
  const ctx: string[] = [];
  const lower = message.toLowerCase();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  ctx.push(`[DATE: ${today}]`);

  /* ── RAG: knowledge base search ── */
  const kbResults = await searchKnowledge(message);
  if (kbResults.length > 0) {
    ctx.push(`[KNOWLEDGE BASE]\n${kbResults.join('\n---\n')}`);
  }

  /* ── Detect stock symbols and fetch live quotes ── */
  const rawTokens = message.split(/\s+/);
  const candidates = new Set<string>();

  const pricePattern = /(?:price of|what is|how is|quote for|rate of|about|price for|stock price of)\s+([A-Za-z]{2,})/gi;
  let m: RegExpExecArray | null;
  while ((m = pricePattern.exec(message)) !== null) {
    candidates.add(m[1].toUpperCase());
  }

  for (const w of rawTokens) {
    const cleaned = w.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (cleaned.length >= 2 && cleaned.length <= 12 && !STOP_WORDS.has(cleaned)) {
      candidates.add(cleaned);
    }
  }

  const validQuotes: any[] = [];
  for (const sym of [...candidates].slice(0, 5)) {
    try {
      const raw = await yf.quote([`${sym}.NS`]);
      const q = Array.isArray(raw) ? raw[0] : raw;
      if (q && q.regularMarketPrice && q.symbol) {
        validQuotes.push(q);
      }
    } catch {}
  }

  if (validQuotes.length > 0) {
    const lines = validQuotes.map((q: any) => {
      const sym = q.symbol?.replace(/\.(NS|BO)$/, '');
      return `${sym}: ₹${q.regularMarketPrice?.toFixed(2) || 'N/A'} | Change: ${q.regularMarketChangePercent?.toFixed(2) || 'N/A'}% | High: ₹${q.regularDayHigh?.toFixed(2) || 'N/A'} | Low: ₹${q.regularDayLow?.toFixed(2) || 'N/A'} | Volume: ${q.regularMarketVolume?.toLocaleString() || 'N/A'}`;
    });
    ctx.push(`[LIVE PRICES]\n${lines.join('\n')}`);
  }

  /* ── IPO query ── */
  if (lower.includes('ipo')) {
    try {
      const res = await fetch(`${origin}/api/stocks/ipos`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const ipos = (data.ipos || []).slice(0, 5);
        if (ipos.length) {
          const lines = ipos.map((i: any) =>
            `${i.company_name} (₹${i.price_band || 'N/A'}, ${i.open_date}–${i.close_date}, Size: ₹${i.issue_size_cr}Cr, Lot: ${i.lot_size || 'N/A'}, Status: ${i.status})`
          );
          ctx.push(`[UPCOMING IPOS]\n${lines.join('\n')}`);
        } else {
          ctx.push('[UPCOMING IPOS]\nNo upcoming IPOs found.');
        }
      }
    } catch {}
  }

  /* ── News query ── */
  const newsKeywords = ['news', 'latest', 'headlines', 'what\'s happening', 'market today'];
  if (newsKeywords.some(k => lower.includes(k))) {
    try {
      const res = await fetch(`${origin}/api/stocks/news-latest?page=1`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const articles = (data.articles || []).slice(0, 5);
        if (articles.length) {
          const lines = articles.map((a: any) => `${a.title} (${a.source}, ${a.publishedAt})`);
          ctx.push(`[LATEST NEWS]\n${lines.join('\n')}`);
        }
      }
    } catch {}
  }

  return ctx.join('\n\n');
}

/* ------------------------------------------------------------------ */
/*  System prompt                                                      */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are a REAL-TIME stock market assistant for Indian markets (NSE/BSE). Follow these rules STRICTLY:

1. **LIVE DATA OVERRIDES EVERYTHING.** Data in [LIVE PRICES], [UPCOMING IPOS], [LATEST NEWS], or [KNOWLEDGE BASE] sections is from live APIs. Use it as factual source. NEVER override with your training data.

2. **ALWAYS use ₹ for prices.** Never say "rupees", "INR", or "Rs".

3. Use **bold** for symbols and numbers.

4. Keep it concise (3-4 sentences) unless asked for detail.

5. Read the conversation HISTORY below to maintain context across messages.`;

/* ------------------------------------------------------------------ */
/*  Groq calls                                                         */
/* ------------------------------------------------------------------ */

const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

async function callGroq(
  apiKey: string,
  system: string,
  chatHistory: { role: string; content: string }[],
  model: string,
  stream: boolean,
): Promise<Response> {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        ...chatHistory.slice(-10),
      ],
      stream,
      max_tokens: 500,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(25000),
  });
}

/* ------------------------------------------------------------------ */
/*  SSE helpers                                                        */
/* ------------------------------------------------------------------ */

const encoder = new TextEncoder();

function sseToken(token: string): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ token })}\n\n`);
}

function sseDone(): Uint8Array {
  return encoder.encode('data: [DONE]\n\n');
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        role: 'bot',
        text: 'Groq API key not configured. Set `GROQ_API_KEY` in `.env.local`. Get a free key at https://console.groq.com/keys',
      });
    }

    const { message, history } = await request.json();
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({
        role: 'bot',
        text: 'Please type a question about stocks, IPOs, or market news.',
      });
    }

    const trimmed = message.trim();
    const origin = request.nextUrl.origin;
    const context = await buildContext(trimmed, origin);

    const systemWithContext = context
      ? `${SYSTEM_PROMPT}\n\n--- LIVE DATA INJECTED BELOW — USE IT ---\n${context}`
      : SYSTEM_PROMPT;

    const chatHistory: { role: string; content: string }[] = (history || []).slice(-10);

    /* ── Try primary model with streaming ── */
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      const stream = i === 0;
      try {
        const groqRes = await callGroq(apiKey, systemWithContext, chatHistory, model, stream);

        if (groqRes.ok && stream) {
          const readingStream = new ReadableStream({
            async start(controller) {
              const reader = groqRes.body!.getReader();
              const decoder = new TextDecoder();
              let buffer = '';

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const data = line.slice(6).trim();
                      if (data === '[DONE]') continue;
                      try {
                        const parsed = JSON.parse(data);
                        const token = parsed.choices?.[0]?.delta?.content || '';
                        if (token) controller.enqueue(sseToken(token));
                      } catch {}
                    }
                  }
                }
              } catch {}
              controller.enqueue(sseDone());
              controller.close();
            },
          });

          return new Response(readingStream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
          });
        }

        if (groqRes.ok && !stream) {
          const data = await groqRes.json();
          const reply = data?.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ role: 'bot', text: reply });
          }
        }

        if (!groqRes.ok) {
          const errText = await groqRes.text().catch(() => '');
          console.warn(`[${model}] ${groqRes.status}: ${errText.slice(0, 200)}`);
        }
      } catch (e: any) {
        console.warn(`[${model}] error: ${e?.message || e}`);
      }
    }

    return NextResponse.json({
      role: 'bot',
      text: 'All AI models unavailable. Please try again in a moment.',
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json({
      role: 'bot',
      text: `Server error: ${err?.message || 'Unknown'}`,
    });
  }
}
