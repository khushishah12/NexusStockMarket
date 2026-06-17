import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const PER_PAGE = 10;

/* ── NewsAPI (primary) ── */

async function fetchNewsApi(query: string, pageSize = 15): Promise<any[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${key}`;
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
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=10&sort=datedesc&sourcecountry:IN&lang:English`;
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

/* ── RSS ── */

const RSS_FEEDS: { url: string; name: string }[] = [
  { url: 'https://www.livemint.com/rss/money', name: 'Livemint' },
  { url: 'https://www.thehindubusinessline.com/opinion/columns/?service=rss', name: 'Hindu Business Line' },
];

async function fetchAllRss(): Promise<any[]> {
  try {
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
          results.push({
            title,
            description: descRaw.replace(/<[^>]+>/g, '').slice(0, 300),
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
      const key = a.title?.toLowerCase().slice(0, 80);
      if (key && !seen.has(key)) {
        seen.add(key);
        all.push(a);
      }
    }
  }
  all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return all;
}

/* ── Route ── */

export async function GET(request: NextRequest) {
  try {
    const pageStr = request.nextUrl.searchParams.get('page') || '1';
    const page = Math.max(1, parseInt(pageStr, 10) || 1);

    const newsApiQuery = 'Indian stock market OR NSE OR BSE OR Sensex OR Nifty OR "India stocks" OR "Indian equities" OR (India AND IPO) OR (India AND markets)';
    const gdeltQuery = '(stock market OR BSE OR NSE OR Sensex OR Nifty OR IPO OR SEBI) (India OR Indian)';

    const [newsapi, gdelt, rss] = await Promise.all([
      fetchNewsApi(newsApiQuery, 15),
      fetchGdelt(gdeltQuery),
      fetchAllRss(),
    ]);

    const all = mergeDedupe([newsapi, gdelt, rss]);
    const total = all.length;
    const start = (page - 1) * PER_PAGE;
    const pageArticles = all.slice(start, start + PER_PAGE);

    return NextResponse.json({
      articles: pageArticles,
      page,
      perPage: PER_PAGE,
      total,
      hasMore: start + PER_PAGE < total,
    });
  } catch (err) {
    console.error('News latest error:', err);
    return NextResponse.json({ articles: [], page: 1, perPage: 10, total: 0, hasMore: false });
  }
}
