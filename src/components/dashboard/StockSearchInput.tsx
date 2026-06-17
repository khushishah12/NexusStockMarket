'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';

interface StockResult {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
}

interface StockSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

export default function StockSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Search stocks...',
  className = '',
}: StockSearchInputProps) {
  const [results, setResults] = useState<StockResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) { setResults([]); setOpen(false); return; }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setResults(data.slice(0, 15));
        setOpen(true);
        setHighlightIdx(-1);
      } else {
        setResults([]);
        setOpen(false);
      }
    } catch {
      setResults([]);
      setOpen(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => handleSearch(value.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, handleSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (sym: string) => {
    onSelect(sym);
    onChange(sym);
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      select(results[highlightIdx].short_symbol);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value.toUpperCase()); setHighlightIdx(-1); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
          suppressHydrationWarning
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-500" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0b1120] shadow-2xl shadow-black/60 backdrop-blur-xl">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              onClick={() => select(r.short_symbol)}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                i === highlightIdx ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{r.short_symbol}</span>
                <span className="text-[10px] font-medium uppercase text-slate-500">{r.exchange}</span>
              </div>
              {r.company_name && (
                <span className="max-w-[200px] truncate text-xs text-slate-500">{r.company_name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
