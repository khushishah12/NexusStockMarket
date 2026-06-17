import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

function extractContent(html: string): { title: string; body: string } {
  let title = '';
  const titleMatch = html.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i);
  if (titleMatch) title = (titleMatch[1] || titleMatch[2] || '').trim();

  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, ' ');
  text = text.replace(/<form[\s\S]*?<\/form>/gi, ' ');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const articleMatch = text.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
  const mainMatch = text.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i);
  const bodyMatch = text.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);

  let content = '';
  if (articleMatch) content = articleMatch[1];
  else if (mainMatch) content = mainMatch[1];
  else if (bodyMatch) content = bodyMatch[1];
  else content = text;

  content = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(n))
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .replace(/(\s*\n\s*){3,}/g, '\n\n')
    .trim();

  const paras = content.split(/\n{2,}/).filter(p => p.trim().length > 60);

  return { title, body: paras.join('\n\n') };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch: ${res.status}` }, { status: 502 });
    }

    const html = await res.text();
    const { title, body } = extractContent(html);

    if (!body || body.length < 50) {
      return NextResponse.json({ error: 'Could not extract article content' }, { status: 422 });
    }

    return NextResponse.json({
      title,
      content: body,
      url,
      source: new URL(url).hostname.replace('www.', ''),
    });
  } catch (err: any) {
    console.error('News content error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch article' }, { status: 500 });
  }
}
