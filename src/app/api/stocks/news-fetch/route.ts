import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/* ── GDELT (no key required) ── */

async function fetchGdelt(query: string): Promise<any[]> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=10&sort=datedesc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();

    const raw = data?.articles || data?.results || data?.response?.docs || [];
    if (!Array.isArray(raw)) return [];

    return raw.map((a: any) => ({
      title: a.title || a.Title || a.headline || '',
      description: a.selectionheadline || a.summary || a.selectionbody || a.snippet || a.description || '',
      source: a.domain || a.Domain || a.sourcecountry || a.source || 'GDELT',
      url: a.url || a.Url || '',
      publishedAt: a.seculardate || a.date || a.Date || a.pubDate || new Date().toISOString().split('T')[0],
    })).filter((a: any) => a.title);
  } catch {
    return [];
  }
}

/* ── NewsAPI ── */

async function fetchNewsApi(query: string): Promise<any[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
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

/* ── RSS Feed fallback ── */

const RSS_FEEDS: { url: string; name: string }[] = [
  { url: 'https://economictimes.indiatimes.com/rssfeeds/1975241501.cms', name: 'Economic Times' },
  { url: 'https://www.livemint.com/rss/money', name: 'Livemint' },
  { url: 'https://www.moneycontrol.com/rss/market.xml', name: 'Moneycontrol' },
  { url: 'https://www.business-standard.com/rss/markets-101.rss', name: 'Business Standard' },
  { url: 'https://www.thehindubusinessline.com/opinion/columns/?service=rss', name: 'Hindu Business Line' },
];

async function fetchRss(query: string): Promise<any[]> {
  try {
    const q = query.toLowerCase();
    const results: any[] = [];

    for (const feed of RSS_FEEDS) {
      try {
        const res = await fetch(feed.url, { signal: AbortSignal.timeout(6000) });
        const xml = await res.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items) {
          const title = (item.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/)?.[1] || item.match(/<title>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/)?.[2] || '').trim();
          const descRaw = item.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/)?.[1] || item.match(/<description>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/)?.[2] || '';
          const link = (item.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/)?.[1] || item.match(/<link>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/link>/)?.[2] || '').trim();
          const dateRaw = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

          const desc = descRaw.replace(/<[^>]+>/g, '').slice(0, 300);

          if (q && !title.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) continue;

          results.push({
            title,
            description: desc,
            source: feed.name,
            url: link,
            publishedAt: dateRaw ? new Date(dateRaw).toISOString().split('T')[0] : '',
          });
        }
      } catch {}
    }

    return results;
  } catch {
    return [];
  }
}

/* ── Merge & Dedupe ── */

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

    const query = `"${cleanName || cleanSymbol}" ${cleanName || cleanSymbol} stock NSE BSE India`;
    const [gdelt, newsapi, rss] = await Promise.all([
      fetchGdelt(query),
      fetchNewsApi(query),
      fetchRss(cleanName || cleanSymbol),
    ]);

    const articles = mergeDedupe([gdelt, newsapi, rss]);

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
