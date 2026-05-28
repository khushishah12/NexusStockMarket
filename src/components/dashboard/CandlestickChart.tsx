'use client';

import { useRef, useEffect, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OHLCVPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternInfo {
  pattern_name: string;
  pattern_region: { start_index: number; end_index: number };
  anchor_points: { p1: number; p2: number; p3: number; p4: number };
  highlight_polygon: [number, number][];
  [key: string]: any;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PATTERN_COLORS = [
  { fill: 'rgba(244,114,182,0.12)', stroke: '#f472b6', band: 'rgba(244,114,182,0.05)' },
  { fill: 'rgba(251,191,36,0.12)', stroke: '#fbbf24', band: 'rgba(251,191,36,0.05)' },
  { fill: 'rgba(167,139,250,0.12)', stroke: '#a78bfa', band: 'rgba(167,139,250,0.05)' },
  { fill: 'rgba(52,211,153,0.12)', stroke: '#34d399', band: 'rgba(52,211,153,0.05)' },
  { fill: 'rgba(248,113,113,0.12)', stroke: '#f87171', band: 'rgba(248,113,113,0.05)' },
  { fill: 'rgba(250,204,21,0.12)', stroke: '#facc15', band: 'rgba(250,204,21,0.05)' },
];

const L = { top: 20, right: 20, bottom: 40, left: 70 };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtTs(ts: number, tf: string): string {
  const d = new Date(ts * 1000);
  if (tf === '1D') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (tf === '5D' || tf === '1M') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface Props {
  data: OHLCVPoint[];
  patterns: PatternInfo[];
  symbol: string;
  timeframe: string;
  className?: string;
}

export default function CandlestickChart({ data, patterns, symbol, timeframe, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const vp = useRef({
    startIdx: 0,
    visibleCount: 0,
    priceMin: 0,
    priceMax: 0,
    dragging: false,
    dragX: 0,
    dragY: 0,
    dragStartIdx: 0,
    dragPriceMin: 0,
    dragPriceMax: 0,
  });

  /* ---- Initialise viewport on data change ---- */
  useEffect(() => {
    if (data.length === 0) return;
    const prices = data.flatMap(d => [d.high, d.low]);
    const mn = Math.min(...prices);
    const mx = Math.max(...prices);
    const pad = (mx - mn) * 0.1 || mn * 0.1;
    vp.current = {
      ...vp.current,
      startIdx: 0,
      visibleCount: data.length,
      priceMin: mn - pad,
      priceMax: mx + pad,
    };
    draw();
  }, [data, patterns]);

  /* ---- Resize ---- */
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ---- Visible patterns helper ---- */
  function visiblePatterns() {
    const v = vp.current;
    return patterns.filter(p => {
      const si = p.pattern_region.start_index ?? -1;
      const ei = p.pattern_region.end_index ?? -1;
      return ei >= v.startIdx && si < v.startIdx + v.visibleCount;
    });
  }

  /* ---- Main draw ---- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width;
    const H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const v = vp.current;
    const chartW = W - L.left - L.right;
    const chartH = H - L.top - L.bottom;
    const step = chartW / Math.max(1, v.visibleCount);
    const xCenter = (i: number) => L.left + i * step + step / 2;
    const yPos = (price: number) => L.top + chartH - ((price - v.priceMin) / (v.priceMax - v.priceMin)) * chartH;
    const vpPat = visiblePatterns();

    /* ---- Background ---- */
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    /* ---- Grid ---- */
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const GRID_LINES = 8;
    for (let i = 0; i <= GRID_LINES; i++) {
      const y = L.top + (i / GRID_LINES) * chartH;
      ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(W - L.right, y); ctx.stroke();
    }

    /* ---- Price labels ---- */
    ctx.fillStyle = '#475569';
    ctx.font = '10px "SF Mono",monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= GRID_LINES; i++) {
      const y = L.top + (i / GRID_LINES) * chartH;
      const price = v.priceMax - (i / GRID_LINES) * (v.priceMax - v.priceMin);
      ctx.fillText(fmtPrice(price), L.left - 8, y);
    }

    /* ---- Time labels ---- */
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxLabels = Math.min(10, Math.floor(v.visibleCount / 3));
    const labelStep = Math.max(1, Math.floor(v.visibleCount / maxLabels));
    for (let i = 0; i < v.visibleCount; i += labelStep) {
      const idx = v.startIdx + i;
      if (idx >= 0 && idx < data.length) {
        ctx.fillText(fmtTs(data[idx].timestamp, timeframe), xCenter(i), H - L.bottom + 6);
      }
    }

    /* ---- Pattern background bands ---- */
    for (let pi = 0; pi < patterns.length; pi++) {
      const p = patterns[pi];
      const si = p.pattern_region.start_index;
      const ei = p.pattern_region.end_index;
      if (si == null || ei == null || ei < v.startIdx || si >= v.startIdx + v.visibleCount) continue;
      const viSi = Math.max(0, si - v.startIdx);
      const viEi = Math.min(v.visibleCount - 1, ei - v.startIdx);
      const color = PATTERN_COLORS[pi % PATTERN_COLORS.length];
      ctx.fillStyle = color.band;
      ctx.fillRect(L.left + viSi * step, L.top, (viEi - viSi + 1) * step, chartH);
    }

    /* ---- Candlesticks ---- */
    for (let i = 0; i < v.visibleCount; i++) {
      const idx = v.startIdx + i;
      if (idx < 0 || idx >= data.length) continue;
      const d = data[idx];
      const x = xCenter(i);
      const cw = Math.max(2, step * 0.65);
      const hw = cw / 2;

      const oy = yPos(d.open);
      const cy = yPos(d.close);
      const hy = yPos(d.high);
      const ly = yPos(d.low);
      const isUp = d.close >= d.open;
      const c = isUp ? '#22c55e' : '#ef4444';

      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, ly); ctx.stroke();

      ctx.fillStyle = c;
      const top = Math.min(oy, cy);
      const bh = Math.max(1, Math.abs(cy - oy));
      ctx.fillRect(x - hw, top, cw, bh);
    }

    /* ---- Pattern polygons + anchor overlays ---- */
    for (let pi = 0; pi < patterns.length; pi++) {
      const p = patterns[pi];
      const color = PATTERN_COLORS[pi % PATTERN_COLORS.length];

      /* Polygon */
      const poly = p.highlight_polygon;
      if (poly && poly.length >= 3) {
        ctx.beginPath();
        let started = false;
        for (const [ix, pv] of poly) {
          const ri = ix - v.startIdx;
          if (ri < -1 || ri > v.visibleCount + 1) continue;
          const px = xCenter(ri);
          const py = yPos(pv);
          if (!started) { ctx.moveTo(px, py); started = true; }
          else { ctx.lineTo(px, py); }
        }
        if (started) {
          ctx.closePath();
          ctx.fillStyle = color.fill;
          ctx.fill();
          ctx.strokeStyle = color.stroke;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      /* Anchors */
      const anchors = p.anchor_points;
      if (anchors) {
        const keys = ['p1', 'p2', 'p3', 'p4'] as const;
        const pts: { x: number; y: number }[] = [];
        for (const key of keys) {
          const ai = anchors[key];
          if (ai == null || ai < 0 || ai >= data.length) continue;
          const ri = ai - v.startIdx;
          if (ri < 0 || ri >= v.visibleCount) continue;
          pts.push({ x: xCenter(ri), y: yPos(data[ai].close) });
        }
        if (pts.length > 1) {
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = color.stroke;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        for (const pt of pts) {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = color.stroke; ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
    }

    /* ---- Pattern polygon outlines (re-draw on top for clarity) ---- */
    for (let pi = 0; pi < patterns.length; pi++) {
      const p = patterns[pi];
      const poly = p.highlight_polygon;
      if (!poly || poly.length < 3) continue;
      const color = PATTERN_COLORS[pi % PATTERN_COLORS.length];
      ctx.beginPath();
      let started = false;
      for (const [ix, pv] of poly) {
        const ri = ix - v.startIdx;
        if (ri < -1 || ri > v.visibleCount + 1) continue;
        const px = xCenter(ri);
        const py = yPos(pv);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else { ctx.lineTo(px, py); }
      }
      if (started) {
        ctx.closePath();
        ctx.strokeStyle = color.stroke;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();
      }
    }

    /* ---- No data overlay ---- */
    if (v.visibleCount < 3 && data.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Zoom out to see candles', W / 2, H / 2);
    }

    /* ---- Update legend ---- */
    updateLegend(vpPat);
  }, [data, patterns, timeframe]);

  /* ---- Legend ---- */
  function updateLegend(vpPat: PatternInfo[]) {
    const el = legendRef.current;
    if (!el) return;
    if (vpPat.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = vpPat.map((p, i) => {
      const c = PATTERN_COLORS[i % PATTERN_COLORS.length];
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 8px;background:rgba(11,17,32,0.85);border-radius:6px;border:1px solid rgba(255,255,255,0.06);white-space:nowrap">
        <span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:${c.stroke}"></span>
        <span style="font-size:11px;color:#94a3b8">${p.pattern_name}</span>
      </div>`;
    }).join('');
  }

  /* ---- Wheel zoom ---- */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const v = vp.current;
    const chartW = rect.width - L.left - L.right;
    const chartH = rect.height - L.top - L.bottom;

    const mouseX = e.clientX - rect.left - L.left;
    const mouseY = e.clientY - rect.top - L.top;
    const dataIdxRel = v.visibleCount * (mouseX / chartW);
    const dataPriceRatio = 1 - mouseY / chartH;

    const zoomFactor = e.deltaY > 0 ? 1.12 : 1 / 1.12;

    /* X zoom centered on mouse */
    const newCount = Math.max(8, Math.min(data.length, Math.round(v.visibleCount * zoomFactor)));
    const oldEnd = v.startIdx + v.visibleCount;
    const centerIdx = v.startIdx + dataIdxRel;
    let newStart = Math.round(centerIdx - dataIdxRel * (newCount / v.visibleCount));
    newStart = Math.max(0, Math.min(newStart, data.length - newCount));
    v.startIdx = newStart;
    v.visibleCount = newCount;

    /* Y zoom centered on mouse */
    const priceRange = v.priceMax - v.priceMin;
    const centerPrice = v.priceMin + dataPriceRatio * priceRange;
    const newRange = priceRange * zoomFactor;
    v.priceMin = centerPrice - dataPriceRatio * newRange;
    v.priceMax = v.priceMin + newRange;

    draw();
  }, [data, draw]);

  /* ---- Mouse drag pan ---- */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const v = vp.current;
    v.dragging = true;
    v.dragX = e.clientX;
    v.dragY = e.clientY;
    v.dragStartIdx = v.startIdx;
    v.dragPriceMin = v.priceMin;
    v.dragPriceMax = v.priceMax;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const v = vp.current;
    if (!v.dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const chartW = rect.width - L.left - L.right;
    const chartH = rect.height - L.top - L.bottom;

    const dx = e.clientX - v.dragX;
    const dy = e.clientY - v.dragY;

    const candleDelta = -dx / (chartW / v.visibleCount);
    v.startIdx = Math.max(0, Math.min(data.length - v.visibleCount, Math.round(v.dragStartIdx + candleDelta)));

    const priceRatio = v.dragPriceMax - v.dragPriceMin;
    const priceDelta = dy / chartH * priceRatio;
    v.priceMin = v.dragPriceMin + priceDelta;
    v.priceMax = v.dragPriceMax + priceDelta;

    draw();
  }, [data, draw]);

  const handleMouseUp = useCallback(() => {
    vp.current.dragging = false;
  }, []);

  /* ---- Touch support ---- */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const v = vp.current;
      v.dragging = true;
      v.dragX = t.clientX;
      v.dragY = t.clientY;
      v.dragStartIdx = v.startIdx;
      v.dragPriceMin = v.priceMin;
      v.dragPriceMax = v.priceMax;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && vp.current.dragging) {
      const t = e.touches[0];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const chartW = rect.width - L.left - L.right;
      const v = vp.current;
      const dx = t.clientX - v.dragX;
      const dy = t.clientY - v.dragY;
      const candleDelta = -dx / (chartW / v.visibleCount);
      v.startIdx = Math.max(0, Math.min(data.length - v.visibleCount, Math.round(v.dragStartIdx + candleDelta)));
      const priceRatio = v.dragPriceMax - v.dragPriceMin;
      v.priceMin = v.dragPriceMin + (dy / rect.height) * priceRatio;
      v.priceMax = v.dragPriceMax + (dy / rect.height) * priceRatio;
      draw();
    }
  }, [data, draw]);

  const handleTouchEnd = useCallback(() => {
    vp.current.dragging = false;
  }, []);

  /* ---- Last price label (top-left) ---- */
  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const prevPrice = data.length > 1 ? data[data.length - 2].close : lastPrice;
  const chg = lastPrice - prevPrice;
  const chgPct = prevPrice ? (chg / prevPrice) * 100 : 0;

  return (
    <div className={`relative ${className}`}>
      {/* Price indicator top-left */}
      <div className="pointer-events-none absolute left-[70px] top-[4px] z-10 flex items-baseline gap-2">
        <span className="text-base font-bold text-white">{fmtPrice(lastPrice)}</span>
        <span className={`text-xs font-medium ${chg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {chg >= 0 ? '+' : ''}{fmtPrice(chg)} ({chg >= 0 ? '+' : ''}{chgPct.toFixed(2)}%)
        </span>
      </div>

      {/* Legend */}
      <div ref={legendRef} className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col gap-1" />

      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {/* Instructions */}
      {data.length > 0 && (
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-slate-600">
          Scroll to zoom · Drag to pan
        </div>
      )}
    </div>
  );
}
