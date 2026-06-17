'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Newspaper, ExternalLink, Clock, Building2, Loader2, TrendingUp, TrendingDown, Minus, ArrowLeft, RefreshCw, X } from 'lucide-react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StockResult {
  company_name: string;
  symbol: string;
  exchange: string;
  sector: string;
}

interface Article {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (days > 7) return `${Math.floor(days / 7)}w ago`;
  if (days > 0) return `${days}d ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs > 0) return `${hrs}h ago`;
  return 'Just now';
}

function extractSentiment(title: string, desc: string): 'positive' | 'negative' | 'neutral' {
  const t = (title + ' ' + desc).toLowerCase();
  const pos = ['surge', 'rally', 'gain', 'profit', 'bull', 'rise', 'up', 'positive', 'growth', 'record', 'high', 'beat'];
  const neg = ['fall', 'drop', 'loss', 'decline', 'bear', 'down', 'negative', 'crash', 'low', 'miss', 'cut', 'slump'];
  const pScore = pos.filter(w => t.includes(w)).length;
  const nScore = neg.filter(w => t.includes(w)).length;
  if (pScore > nScore) return 'positive';
  if (nScore > pScore) return 'negative';
  return 'neutral';
}

const SENTIMENT_STYLE = {
  positive: { border: 'border-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-300', icon: TrendingUp },
  negative: { border: 'border-rose-500/30', badge: 'bg-rose-500/15 text-rose-300', icon: TrendingDown },
  neutral: { border: 'border-slate-500/30', badge: 'bg-slate-500/15 text-slate-300', icon: Minus },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NewsPage() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StockResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selected, setSelected] = useState<StockResult | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);
  const [stockMode, setStockMode] = useState(false);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);
  const [detailContent, setDetailContent] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Load latest news on mount ── */
  useEffect(() => {
    loadLatest(1);
  }, []);

  async function loadLatest(p: number, append = false) {
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/stocks/news-latest?page=${p}`);
      const data = await res.json();
      if (append) {
        setArticles(prev => [...prev, ...(data.articles || [])]);
      } else {
        setArticles(data.articles || []);
      }
      setPage(p);
      setHasMore(data.hasMore || false);
    } catch {}
    setNewsLoading(false);
  }

  /* ── Search stocks ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      debounceRef.current = setTimeout(() => {
        setSuggestions([]);
        setShowDropdown(false);
      }, 0);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/news-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowDropdown(true);
      } catch {}
    }, 250);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Select stock ── */
  const selectStock = useCallback(async (s: StockResult) => {
    setStockMode(true);
    setSelected(s);
    setShowDropdown(false);
    setQuery(`${s.company_name} (${s.symbol})`);
    setNewsLoading(true);

    try {
      const res = await fetch(`/api/stocks/news-fetch?symbol=${encodeURIComponent(s.symbol)}&company_name=${encodeURIComponent(s.company_name)}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setHasMore(false);
    } catch {}

    setNewsLoading(false);
  }, []);

  /* ── Back to all news ── */
  const backToAll = useCallback(() => {
    setStockMode(false);
    setSelected(null);
    setQuery('');
    setPage(1);
    loadLatest(1);
  }, []);

  /* ── Load More ── */
  const loadMore = useCallback(() => {
    loadLatest(page + 1, true);
  }, [page]);

  /* ── Open article detail ── */
  const openArticle = useCallback(async (article: Article) => {
    setDetailArticle(article);
    setDetailContent('');
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await fetch('/api/stocks/news-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.url }),
      });
      const data = await res.json();
      if (data.error) {
        setDetailError(data.error);
      } else {
        setDetailContent(data.content || '');
      }
    } catch {
      setDetailError('Failed to load article content');
    }
    setDetailLoading(false);
  }, []);

  return (
    <PageTransition>
      <div className="flex items-center justify-between">
        <PageHeader
          tag="News & Sentiment"
          title={stockMode ? (selected?.company_name || 'Stock News') : 'Stock News'}
          subtitle={stockMode ? `Latest news for ${selected?.company_name}` : 'Latest Indian market news, headlines and sentiment analysis.'}
        />
        {stockMode && (
          <button
            onClick={backToAll}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to all news
          </button>
        )}
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-8" ref={dropdownRef}>
        <div className="relative mx-auto max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0 && query.trim()) setShowDropdown(true); }}
            placeholder="Search company or symbol (e.g. Tata, RELIANCE, Infosys)..."
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3.5 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/30 focus:shadow-sm focus:shadow-cyan-500/5"
          />
        </div>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-1/2 top-full z-50 mt-2 w-full max-w-2xl -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[#0f1729] p-1 shadow-2xl shadow-black/60">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => selectStock(s)}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-white/[0.06]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-400/20">
                  <Building2 className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{s.company_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-slate-300">{s.symbol}</span>
                    <span>{s.exchange}</span>
                    <span>{s.sector}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && suggestions.length === 0 && query.trim() && (
          <div className="absolute left-1/2 top-full z-50 mt-2 w-full max-w-2xl -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[#0f1729] p-4 text-center text-sm text-slate-500 shadow-2xl shadow-black/60">
            No stocks found for &quot;{query.trim()}&quot;
          </div>
        )}
      </div>

      {/* ── Stock info pill ── */}
      {stockMode && selected && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-3">
          <Building2 className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">{selected.company_name}</span>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-xs text-slate-300">{selected.symbol}</span>
          <span className="text-xs text-slate-500">{selected.exchange}</span>
          <span className="ml-auto text-xs text-slate-500">{articles.length} articles</span>
        </div>
      )}

      {/* ── News grid ── */}
      {newsLoading && articles.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-500">Fetching latest news...</p>
          </div>
        </div>
      ) : articles.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((a, i) => {
              const sentiment = extractSentiment(a.title, a.description);
              const st = SENTIMENT_STYLE[sentiment];
              const SentIcon = st.icon;
              return (
                <div
                  key={`${a.url || i}`}
                  onClick={() => openArticle(a)}
                  className={`group flex cursor-pointer flex-col rounded-xl border ${st.border} bg-white/[0.02] p-5 transition hover:bg-white/[0.05]`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-slate-400">{a.source}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.badge}`}>
                      <SentIcon className="h-3 w-3" />
                      {sentiment}
                    </span>
                  </div>
                  <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-white transition group-hover:text-cyan-300">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-slate-400">{a.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(a.publishedAt)}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 transition group-hover:text-cyan-400">
                      Read <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Load More ── */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                disabled={newsLoading}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                {newsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Show more articles
              </button>
            </div>
          )}
        </>
      ) : !newsLoading && articles.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
          <Newspaper className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            {stockMode ? 'No news articles found for this stock' : 'No news articles available right now'}
          </p>
          {stockMode && (
            <button
              onClick={backToAll}
              className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-400 transition hover:bg-white/[0.08]"
            >
              View all market news
            </button>
          )}
        </div>
      ) : null}

      {/* ═══════ ARTICLE DETAIL MODAL ═══════ */}
      {detailArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setDetailArticle(null)}>
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/[0.08] bg-[#0a0f1a] shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="shrink-0 border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-white leading-snug line-clamp-2">{detailArticle.title}</h2>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{detailArticle.source}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(detailArticle.publishedAt)}</span>
                    <span>·</span>
                    <a href={detailArticle.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-cyan-400 hover:underline">
                      Open original <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <button onClick={() => setDetailArticle(null)}
                  className="shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <p className="text-sm text-slate-500">Loading article...</p>
                  </div>
                </div>
              ) : detailError ? (
                <div className="flex flex-col items-center gap-4 py-16 text-center">
                  <p className="text-sm text-rose-400">{detailError}</p>
                  <a href={detailArticle.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-xs text-slate-300 hover:bg-white/[0.08]">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in original source
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {detailContent.split('\n\n').map((para, i) => (
                    <p key={i} className="text-sm leading-relaxed text-slate-300">{para}</p>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="shrink-0 border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
              <p className="text-[10px] text-slate-600">Source: {detailArticle.source}</p>
              <a href={detailArticle.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline">
                <ExternalLink className="h-3 w-3" />
                View original
              </a>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
