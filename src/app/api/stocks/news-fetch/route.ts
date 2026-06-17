import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/* ── NewsAPI (primary) ── */

async function fetchNewsApi(query: string): Promise<any[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.articles || []).map((a: any) => ({
      title: a.title || '',
      description: a.description || '',
      source: a.source?.name || 'NewsAPI',
      url: a.url || '',
      publishedAt: a.publishedAt ? a.publishedAt.split('T')[0] : '',
    })).filter((a: any) => a.title);
  } catch {
    return [];
  }
}

/* ── GDELT (fallback) ── */

async function fetchGdelt(query: string): Promise<any[]> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=10&sort=datedesc&lang:English`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data?.articles || data?.results || [];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((a: any) => a.language === 'English')
      .map((a: any) => ({
        title: a.title || '',
        description: a.selectionheadline || a.body || '',
        source: a.domain || 'GDELT',
        url: a.url || '',
        publishedAt: a.seendate ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}` : '',
      }))
      .filter((a: any) => a.title);
  } catch {
    return [];
  }
}

/* ── RSS fallback ── */

const RSS_FEEDS: { url: string; name: string }[] = [
  { url: 'https://www.livemint.com/rss/money', name: 'Livemint' },
  { url: 'https://www.thehindubusinessline.com/opinion/columns/?service=rss', name: 'Hindu Business Line' },
];

async function fetchRss(query: string): Promise<any[]> {
  try {
    const q = query.toLowerCase();
    const results: any[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
        const xml = await res.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items) {
          const titleMatch = item.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/);
          const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
          if (!title) continue;
          const descRaw = item.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/)?.[1] || item.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/)?.[2] || '';
          const link = item.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/)?.[1] || item.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/)?.[2] || '';
          const pubDate = item.match(/<pubDate>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/pubDate>/)?.[1] || item.match(/<pubDate>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/pubDate>/)?.[2] || '';

          const desc = descRaw.replace(/<[^>]+>/g, '').slice(0, 300);

          if (q && !title.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) continue;

          results.push({
            title,
            description: desc,
            source: feed.name,
            url: link.trim(),
            publishedAt: pubDate ? new Date(pubDate).toISOString().split('T')[0] : '',
          });
        }
      } catch {}
    }

    return results;
  } catch {
    return [];
  }
}

/* ── Merge ── */

function mergeDedupe(articles: any[][]): any[] {
  const seen = new Set<string>();
  const all: any[] = [];
  for (const batch of articles) {
    for (const a of batch) {
      const key = a.title?.toLowerCase().slice(0, 80) || a.url;
      if (key && !seen.has(key)) {
        seen.add(key);
        all.push(a);
      }
    }
  }
  all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return all.slice(0, 20);
}

/* ── Route ── */

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol') || '';
    const companyName = request.nextUrl.searchParams.get('company_name') || '';

    if (!symbol && !companyName) {
      return NextResponse.json({ articles: [] });
    }

    const cleanName = companyName.replace(/\.(NS|BO)$/i, '').trim();
    const cleanSymbol = symbol.replace(/\.(NS|BO)$/i, '').trim();

    const searchTerm = cleanName || cleanSymbol;
    const newsApiQuery = `(${searchTerm}) stock OR ${searchTerm} NSE OR ${searchTerm} BSE OR ${searchTerm} India`;
    const gdeltQuery = `(${searchTerm}) (stock OR share OR NSE OR BSE OR India)`;

    const [newsapi, gdelt, rss] = await Promise.all([
      fetchNewsApi(newsApiQuery),
      fetchGdelt(gdeltQuery),
      fetchRss(cleanName || cleanSymbol),
    ]);

    const articles = mergeDedupe([newsapi, gdelt, rss]);

    return NextResponse.json({
      company: cleanName || cleanSymbol,
      symbol: cleanSymbol,
      articles,
    });
  } catch (err) {
    console.error('News fetch error:', err);
    return NextResponse.json({ articles: [] });
  }
}
