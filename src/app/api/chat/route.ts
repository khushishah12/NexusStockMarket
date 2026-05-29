import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a stock market assistant for Indian markets (NSE/BSE). Be concise, accurate, and helpful.

You can answer about:
- Stock prices, performance, and sectors
- IPO dates, price bands, lot sizes
- Earnings announcements and quarterly results
- Market indices (NIFTY 50, SENSEX)
- Financial concepts (PE ratio, market cap, dividends, etc.)
- Top gainers/losers
- Market news summaries

Keep responses under 3-4 sentences unless the user asks for detail. Use **bold** for stock symbols and numbers.`;

const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

async function callGroq(apiKey: string, message: string, model: string): Promise<Response> {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 400,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(25000),
  });
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        role: 'bot',
        text: 'Groq API key not configured. Set `GROQ_API_KEY` in `.env.local`. Get a free key at https://console.groq.com/keys',
      });
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({
        role: 'bot',
        text: 'Please type a question about stocks, IPOs, or market news.',
      });
    }

    const trimmed = message.trim();
    let lastErr = '';
    let debugInfo = '';

    for (const model of MODELS) {
      try {
        const res = await callGroq(apiKey, trimmed, model);
        debugInfo += `[${model} status=${res.status}] `;

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          lastErr = `Model ${model} returned ${res.status}: ${errText.slice(0, 200)}`;
          console.warn(lastErr);
          continue;
        }

        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content;

        if (reply) {
          return NextResponse.json({ role: 'bot', text: reply });
        }
      } catch (e: any) {
        lastErr = `Model ${model} error: ${e?.message || e}`;
        console.warn(lastErr);
      }
    }

    return NextResponse.json({
      role: 'bot',
      text: `All AI models unavailable. ${debugInfo}Last error: ${lastErr || 'Unknown'}`,
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json({
      role: 'bot',
      text: `Server error: ${err?.message || 'Unknown'}`,
    });
  }
}
