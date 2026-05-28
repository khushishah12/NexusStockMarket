'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

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

export interface TrendLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}

export interface CrosshairData {
  x: number;
  y: number;
  candleIdx: number;
  ohlc: { open: number; high: number; low: number; close: number; volume: number } | null;
  ts: string;
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

const TREND_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'];

const L = { top: 36, right: 80, bottom: 44, left: 72 };

const LERP_SPEED = 0.2;
const MOMENTUM_FRICTION = 0.91;
const MOMENTUM_MIN_VEL = 0.15;
const MIN_CANDLE_WIDTH = 2;
const CANDLE_BODY_RATIO = 0.65;
const MIN_VISIBLE_COUNT = 5;
const ZOOM_FACTOR = 1.08;
const MAX_TIME_LABELS = 14;
const CROSSHAIR_SNAP_RADIUS = 6;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function fmtPrice(n: number, compact = false): string {
  if (!isFinite(n)) return '—';
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
    if (abs >= 1e5) return (n / 1e5).toFixed(1) + 'L';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  }
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(n) >= 10) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

function fmtPriceAxis(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (abs >= 1e5) return (n / 1e5).toFixed(1) + 'L';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (abs >= 100) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

function fmtTs(ts: number, zoomLevel: string, timeSpanMs: number): string {
  const d = new Date(ts * 1000);
  if (timeSpanMs < 86400000) {
    if (zoomLevel === 'seconds') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  if (timeSpanMs < 604800000) return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (timeSpanMs < 2592000000) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (timeSpanMs < 31536000000) return d.toLocaleDateString('en-IN', { month: 'short' });
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function niceTickRange(min: number, max: number, desiredTicks: number): { step: number; count: number } {
  const range = max - min;
  if (range <= 0) return { step: 1, count: 1 };
  const roughStep = range / desiredTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / magnitude;
  let nice;
  if (norm <= 1.5) nice = 1;
  else if (norm <= 3.5) nice = 2;
  else if (norm <= 7.5) nice = 5;
  else nice = 10;
  const step = nice * magnitude;
  const count = Math.ceil(range / step);
  return { step, count };
}

function detectZoomLevel(c: { count: number; offset: number }, arr: OHLCVPoint[]): { level: string; spanMs: number } {
  if (arr.length < 2) return { level: 'hours', spanMs: 86400000 };
  const si = Math.max(0, Math.floor(c.offset));
  const ei = Math.min(arr.length - 1, Math.floor(c.offset + c.count));
  if (ei <= si) return { level: 'hours', spanMs: 86400000 };
  const spanMs = (arr[ei].timestamp - arr[si].timestamp) * 1000;
  if (c.count > 80) return { level: 'seconds', spanMs };
  if (c.count > 40) return { level: 'minutes', spanMs };
  if (spanMs < 86400000) return { level: 'hours', spanMs };
  if (spanMs < 604800000) return { level: 'days', spanMs };
  if (spanMs < 2592000000) return { level: 'weeks', spanMs };
  if (spanMs < 31536000000) return { level: 'months', spanMs };
  return { level: 'years', spanMs };
}

function roundToNicePrice(p: number, step: number): number {
  return Math.round(p / step) * step;
}

/* ------------------------------------------------------------------ */
/*  Viewport State                                                     */
/* ------------------------------------------------------------------ */

interface VPS {
  offset: number;
  count: number;
  priceMin: number;
  priceMax: number;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  data: OHLCVPoint[];
  patterns: PatternInfo[];
  symbol: string;
  timeframe: string;
  className?: string;
  liveInterval?: number;
  scaleMode?: 'linear' | 'log';
  trendLines?: TrendLine[];
  onTrendLinesChange?: (lines: TrendLine[]) => void;
  crosshairEnabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CandlestickChart({
  data,
  patterns,
  symbol,
  timeframe,
  className = '',
  liveInterval = 0,
  scaleMode = 'linear',
  trendLines: externalTrendLines,
  onTrendLinesChange,
  crosshairEnabled = true,
}: Props) {
  /* ---- Refs ---- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const rafId = useRef(0);

  const cur = useRef<VPS>({ offset: 0, count: 50, priceMin: 0, priceMax: 0 });
  const target = useRef<VPS>({ offset: 0, count: 50, priceMin: 0, priceMax: 0 });
  const animating = useRef(false);
  const momentum = useRef({ vx: 0, vy: 0, active: false });

  const drag = useRef({
    active: false,
    startX: 0, startY: 0,
    startOff: 0, startCount: 0, startPMin: 0, startPMax: 0,
    history: [] as { x: number; y: number; t: number }[],
    verticalLock: false,
  });

  const dataRef = useRef<OHLCVPoint[]>([]);
  const patternsRef = useRef<PatternInfo[]>([]);
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;
  const drawRef = useRef<() => void>(() => {});
  const pollActive = useRef(false);
  const scaleModeRef = useRef(scaleMode);
  scaleModeRef.current = scaleMode;
  const crosshairRefFlag = useRef(crosshairEnabled);
  crosshairRefFlag.current = crosshairEnabled;

  const mouseRef = useRef({ x: -1, y: -1, inChart: false, candleIdx: -1 });
  const trendLinesRef = useRef<TrendLine[]>(externalTrendLines ?? []);
  const drawingTL = useRef<{ x: number; y: number; price: number } | null>(null);
  const draggingTL = useRef<string | null>(null);
  const draggingTLEnd = useRef<'start' | 'end' | null>(null);
  const hoverTL = useRef<string | null>(null);
  const lastPinchDist = useRef(0);

  const [crosshair, setCrosshair] = useState<CrosshairData | null>(null);
  const [verticalLock, setVerticalLock] = useState(false);
  const [trendLineMode, setTrendLineMode] = useState(false);
  const trendLineModeRef = useRef(false);
  trendLineModeRef.current = trendLineMode;

  /* ---- Sync trend lines ---- */
  useEffect(() => {
    if (externalTrendLines) trendLinesRef.current = externalTrendLines;
  }, [externalTrendLines]);

  /* ---- Keep mutable copies ---- */
  useEffect(() => {
    dataRef.current = data.map(d => ({ ...d }));
    patternsRef.current = patterns;
    if (data.length > 0) {
      const prices = data.flatMap(d => [d.high, d.low]);
      const mn = Math.min(...prices);
      const mx = Math.max(...prices);
      const pad = (mx - mn) * 0.1 || mn * 0.1 || 1;
      const vp: VPS = { offset: 0, count: data.length, priceMin: mn - pad, priceMax: mx + pad };
      cur.current = { ...vp };
      target.current = { ...vp };
      animating.current = false;
      momentum.current = { vx: 0, vy: 0, active: false };
      drag.current.history = [];
      mouseRef.current = { x: -1, y: -1, inChart: false, candleIdx: -1 };
      setCrosshair(null);
    }
    drawRef.current();
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [data, patterns]);

  /* ---- Resize ---- */
  useEffect(() => {
    const onResize = () => drawRef.current();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ---- Live polling ---- */
  useEffect(() => {
    if (!liveInterval || liveInterval <= 0 || !symbol) return;
    const id = setInterval(pollLatest, liveInterval * 1000);
    return () => clearInterval(id);
  }, [liveInterval, symbol, timeframe]);

  /* ---- Poll handler ---- */
  async function pollLatest() {
    if (pollActive.current) return;
    pollActive.current = true;
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/ohlcv?timeframe=${timeframeRef.current}`);
      const json = await res.json();
      if (!json.ohlcv || json.ohlcv.length === 0) return;

      const fresh: OHLCVPoint[] = json.ohlcv;
      const lastFresh = fresh[fresh.length - 1];
      const arr = dataRef.current;
      const lastIdx = arr.length - 1;

      if (lastIdx >= 0 && arr[lastIdx].timestamp === lastFresh.timestamp) {
        arr[lastIdx].open = lastFresh.open;
        arr[lastIdx].high = lastFresh.high;
        arr[lastIdx].low = lastFresh.low;
        arr[lastIdx].close = lastFresh.close;
        arr[lastIdx].volume = lastFresh.volume;
      } else if (lastFresh.timestamp > (arr[lastIdx]?.timestamp ?? 0)) {
        arr.push({ ...lastFresh });
        if (arr.length > 3000) arr.splice(0, arr.length - 2500);
      }

      const t = target.current;
      const c = cur.current;
      if (Math.abs(c.offset + c.count - arr.length) < 3) {
        t.offset = Math.max(0, arr.length - t.count);
      }
      updatePriceExtents();
      startAnimating();
    } catch {}
    pollActive.current = false;
  }

  /* ---- Extents from visible range ---- */
  function updatePriceExtents() {
    const arr = dataRef.current;
    if (arr.length === 0) return;
    const si = Math.max(0, Math.floor(cur.current.offset));
    const ei = Math.min(arr.length, si + Math.ceil(cur.current.count));
    let mn = Infinity, mx = -Infinity;
    for (let i = si; i < ei; i++) {
      if (arr[i].high > mx) mx = arr[i].high;
      if (arr[i].low < mn) mn = arr[i].low;
    }
    if (!isFinite(mn)) { mn = arr[si]?.low ?? 0; mx = arr[si]?.high ?? 0; }
    const pad = (mx - mn) * 0.08 || 1;
    target.current.priceMin = mn - pad;
    target.current.priceMax = mx + pad;
  }

  /* ---- Auto-scale ---- */
  const handleAutoScale = useCallback(() => {
    updatePriceExtents();
    startAnimating();
  }, []);

  /* ---- Y position (linear or log) ---- */
  function yPos(pv: number, c: VPS, ch: number, mode: string): number {
    if (mode === 'log' && pv > 0 && c.priceMin > 0) {
      const logMin = Math.log(c.priceMin);
      const logMax = Math.log(c.priceMax);
      return L.top + ch - ((Math.log(pv) - logMin) / (logMax - logMin)) * ch;
    }
    return L.top + ch - ((pv - c.priceMin) / (c.priceMax - c.priceMin)) * ch;
  }

  /* ---- Animation loop ---- */
  function tick() {
    const c = cur.current;
    const t = target.current;
    const m = momentum.current;
    const d = drag.current;
    let keepGoing = false;

    if (m.active && !d.active) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cw = rect.width - L.left - L.right;
        const ch = rect.height - L.top - L.bottom;
        const cps = c.count / cw;
        const pps = (c.priceMax - c.priceMin) / ch;

        t.offset -= m.vx * cps;
        const priceDelta = m.vy * pps;
        t.priceMin -= priceDelta;
        t.priceMax -= priceDelta;

        m.vx *= MOMENTUM_FRICTION;
        m.vy *= MOMENTUM_FRICTION;
        const vel = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        if (vel < MOMENTUM_MIN_VEL) m.active = false;
      }
      clampTarget();
      keepGoing = true;
    }

    if (animating.current) {
      c.offset = lerp(c.offset, t.offset, LERP_SPEED);
      c.count = lerp(c.count, t.count, LERP_SPEED);
      c.priceMin = lerp(c.priceMin, t.priceMin, LERP_SPEED);
      c.priceMax = lerp(c.priceMax, t.priceMax, LERP_SPEED);

      const closeEnough = Math.abs(c.offset - t.offset) < 0.01
        && Math.abs(c.count - t.count) < 0.01
        && Math.abs(c.priceMin - t.priceMin) < 0.001
        && Math.abs(c.priceMax - t.priceMax) < 0.001;
      if (closeEnough && !m.active) {
        c.offset = t.offset; c.count = t.count;
        c.priceMin = t.priceMin; c.priceMax = t.priceMax;
        animating.current = false;
      } else {
        keepGoing = true;
      }
    }

    drawRef.current();
    if (keepGoing) { rafId.current = requestAnimationFrame(tick); }
    else { rafId.current = 0; }
  }

  function startAnimating() {
    animating.current = true;
    if (!rafId.current) rafId.current = requestAnimationFrame(tick);
  }

  function clampTarget() {
    const t = target.current;
    const len = dataRef.current.length;
    if (len === 0) return;
    t.count = clamp(t.count, MIN_VISIBLE_COUNT, len);
    t.offset = clamp(t.offset, 0, len - t.count);
    const minRange = 0.001;
    if (t.priceMax - t.priceMin < minRange) {
      const mid = (t.priceMax + t.priceMin) / 2;
      t.priceMin = mid - minRange / 2;
      t.priceMax = mid + minRange / 2;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Draw                                                               */
  /* ------------------------------------------------------------------ */

  function draw() {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const arr = dataRef.current;
    const pats = patternsRef.current;
    const tf = timeframeRef.current;
    const sm = scaleModeRef.current;
    if (!canvas || !container || arr.length === 0) return;

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

    const c = cur.current;
    const t = target.current;
    const cw = W - L.left - L.right;
    const ch = H - L.top - L.bottom;
    const sIdx = Math.max(0, Math.floor(c.offset));
    const fracOff = c.offset - sIdx;
    const step = cw / Math.max(1, c.count);
    const xCenter = (ri: number) => L.left + (ri - fracOff) * step + step / 2;
    const yP = (pv: number) => yPos(pv, c, ch, sm);

    /* ---- Background ---- */
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    /* ---- Grid & price labels ---- */
    ctx.fillStyle = '#475569';
    ctx.font = '10px "SF Mono","Consolas",monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const { step: tickStep, count: tickCount } = niceTickRange(c.priceMin, c.priceMax, 8);
    const axisMin = roundToNicePrice(c.priceMin, tickStep);
    const axisMax = roundToNicePrice(c.priceMax, tickStep);
    const actualTicks = Math.min(12, Math.max(3, tickCount));

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= actualTicks; i++) {
      const pv = axisMin + (i / actualTicks) * (axisMax - axisMin);
      const y = yP(pv);
      if (y < L.top || y > L.top + ch) continue;
      ctx.beginPath(); ctx.moveTo(L.left, y); ctx.lineTo(W - L.right, y); ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.fillText(fmtPriceAxis(pv), L.left - 8, y);
    }

    /* ---- Time labels ---- */
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const zl = detectZoomLevel(c, arr);
    const maxLabels = Math.min(MAX_TIME_LABELS, Math.max(3, Math.floor(c.count / 3)));
    const labelStep = Math.max(1, Math.floor(c.count / maxLabels));
    for (let i = 0; i < c.count; i += labelStep) {
      const idx = sIdx + i;
      if (idx >= 0 && idx < arr.length) {
        ctx.fillText(fmtTs(arr[idx].timestamp, zl.level, zl.spanMs), xCenter(i), H - L.bottom + 6);
      }
    }

    /* ---- Pattern bands ---- */
    for (let pi = 0; pi < pats.length; pi++) {
      const p = pats[pi];
      const si = p.pattern_region.start_index;
      const ei = p.pattern_region.end_index;
      if (si == null || ei == null || ei < sIdx || si >= sIdx + c.count) continue;
      const viSi = Math.max(0, si - sIdx);
      const viEi = Math.min(c.count - 1, ei - sIdx);
      const col = PATTERN_COLORS[pi % PATTERN_COLORS.length];
      ctx.fillStyle = col.band;
      ctx.fillRect(L.left + (viSi - fracOff) * step, L.top, (viEi - viSi + 1) * step, ch);
    }

    /* ---- Candlesticks ---- */
    const cwPx = Math.max(MIN_CANDLE_WIDTH, step * CANDLE_BODY_RATIO);
    const hw = cwPx / 2;

    for (let i = 0; i < c.count; i++) {
      const idx = sIdx + i;
      if (idx < 0 || idx >= arr.length) continue;
      const d = arr[idx];
      const x = xCenter(i);
      const oy = yP(d.open);
      const cy = yP(d.close);
      const hy = yP(d.high);
      const ly = yP(d.low);
      const isUp = d.close >= d.open;
      const col = isUp ? '#22c55e' : '#ef4444';

      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, ly); ctx.stroke();

      ctx.fillStyle = col;
      const top = Math.min(oy, cy);
      const bh = Math.max(1, Math.abs(cy - oy));
      ctx.fillRect(x - hw, top, cwPx, bh);
    }

    /* ---- Pattern overlays ---- */
    for (let pi = 0; pi < pats.length; pi++) {
      const p = pats[pi];
      const col = PATTERN_COLORS[pi % PATTERN_COLORS.length];
      const poly = p.highlight_polygon;
      if (poly && poly.length >= 3) {
        ctx.beginPath();
        let started = false;
        for (const [ix, pv] of poly) {
          const ri = ix - sIdx;
          if (!isFinite(ri) || ri < -1 || ri > c.count + 1) continue;
          const px = xCenter(ri);
          if (!started) { ctx.moveTo(px, yP(pv)); started = true; }
          else { ctx.lineTo(px, yP(pv)); }
        }
        if (started) {
          ctx.closePath();
          ctx.fillStyle = col.fill; ctx.fill();
          ctx.strokeStyle = col.stroke; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }

      const anchors = p.anchor_points;
      if (anchors) {
        const keys = ['p1', 'p2', 'p3', 'p4'] as const;
        const pts: { x: number; y: number }[] = [];
        for (const key of keys) {
          const ai = anchors[key];
          if (ai == null || ai < 0 || ai >= arr.length) continue;
          const ri = ai - sIdx;
          if (ri < 0 || ri >= c.count) continue;
          pts.push({ x: xCenter(ri), y: yP(arr[ai].close) });
        }
        if (pts.length > 1) {
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = col.stroke; ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
        for (const pt of pts) {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = col.stroke; ctx.fill();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
    }

    /* ---- Pattern outlines (top) ---- */
    for (let pi = 0; pi < pats.length; pi++) {
      const p = pats[pi];
      const poly = p.highlight_polygon;
      if (!poly || poly.length < 3) continue;
      const col = PATTERN_COLORS[pi % PATTERN_COLORS.length];
      ctx.beginPath();
      let started = false;
      for (const [ix, pv] of poly) {
        const ri = ix - sIdx;
        if (!isFinite(ri) || ri < -1 || ri > c.count + 1) continue;
        if (!started) { ctx.moveTo(xCenter(ri), yP(pv)); started = true; }
        else { ctx.lineTo(xCenter(ri), yP(pv)); }
      }
      if (started) { ctx.closePath(); ctx.strokeStyle = col.stroke; ctx.lineWidth = 2; ctx.stroke(); }
    }

    /* ---- Trend lines ---- */
    const tls = trendLinesRef.current;
    const drawing = drawingTL.current;
    const hover = hoverTL.current;

    for (const tl of tls) {
      const ri1 = tl.x1 - sIdx;
      const ri2 = tl.x2 - sIdx;
      if ((ri1 < -1 && ri2 < -1) || (ri1 > c.count + 1 && ri2 > c.count + 1)) continue;
      const px1 = xCenter(ri1);
      const py1 = yP(tl.y1);
      const px2 = xCenter(ri2);
      const py2 = yP(tl.y2);
      const isHover = hover === tl.id;

      ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
      ctx.strokeStyle = tl.color ?? '#60a5fa';
      ctx.lineWidth = isHover ? 2.5 : 1.5;
      ctx.stroke();

      for (const [px, py] of [[px1, py1], [px2, py2]]) {
        ctx.beginPath(); ctx.arc(px, py, isHover ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? '#ffffff' : (tl.color ?? '#60a5fa');
        ctx.fill();
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    if (drawing) {
      const ri = drawing.x - sIdx;
      const px = xCenter(ri);
      ctx.beginPath(); ctx.arc(px, yP(drawing.price), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#60a5fa'; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx >= L.left && mx <= W - L.right && my >= L.top && my <= L.top + ch) {
        ctx.beginPath(); ctx.moveTo(px, yP(drawing.price)); ctx.lineTo(mx, my);
        ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      }
    }

    /* ---- Crosshair ---- */
    const mouse = mouseRef.current;
    if (crosshairEnabled && crosshairRefFlag.current && mouse.inChart && mouse.x >= L.left && mouse.x <= W - L.right) {
      const chX = mouse.x;
      const chY = mouse.y;

      const ray = ctx.getLineDash();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath(); ctx.moveTo(chX, L.top); ctx.lineTo(chX, L.top + ch); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L.left, chY); ctx.lineTo(W - L.right, chY); ctx.stroke();
      ctx.setLineDash(ray);

      if (mouse.candleIdx >= 0 && mouse.candleIdx < arr.length) {
        const cd = arr[mouse.candleIdx];
        const candleX = xCenter(mouse.candleIdx - sIdx);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '11px "SF Mono","Consolas",monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        const tooltipLines = [
          fmtTs(cd.timestamp, detectZoomLevel(c, arr).level, detectZoomLevel(c, arr).spanMs),
          `O: ${fmtPrice(cd.open)}  H: ${fmtPrice(cd.high)}`,
          `L: ${fmtPrice(cd.low)}  C: ${fmtPrice(cd.close)}`,
          `Vol: ${fmtPrice(cd.volume, true)}`,
        ];
        const lineH = 16;
        const padX = 10, padY = 8;
        const tw = 220;
        const th = tooltipLines.length * lineH + padY * 2;
        let tx = candleX + 16;
        let ty = chY - th - 10;
        if (tx + tw > W - L.right) tx = candleX - tw - 16;
        if (ty < L.top) ty = chY + 12;

        tx = clamp(tx, L.left + 4, W - L.right - tw - 4);
        ty = clamp(ty, L.top + 4, L.top + ch - th - 4);

        ctx.fillStyle = 'rgba(11,17,32,0.92)';
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 8); ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let li = 0; li < tooltipLines.length; li++) {
          const ly2 = ty + padY + li * lineH + lineH - 3;
          ctx.fillText(tooltipLines[li], tx + padX, ly2);
        }
      }

      /* Y-axis price marker */
      const priceAtCursor = mouse.candleIdx >= 0
        ? arr[mouse.candleIdx].close
        : c.priceMin + (1 - (chY - L.top) / ch) * (c.priceMax - c.priceMin);
      const yMarkerLabel = fmtPriceAxis(priceAtCursor);
      ctx.font = 'bold 10px "SF Mono","Consolas",monospace';
      const yMTextW = ctx.measureText(yMarkerLabel).width;
      const yMPadX = 6, yMPadY = 4;
      const yMRectW = yMTextW + yMPadX * 2;
      const yMRectH = 10 + yMPadY * 2;
      const yMY = clamp(chY - yMRectH / 2, L.top + 2, L.top + ch - yMRectH - 2);
      const yMX = W - L.right + 4;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.roundRect(yMX, yMY, yMRectW, yMRectH, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(yMarkerLabel, yMX + yMPadX, yMY + yMRectH / 2);

      /* X-axis time marker */
      if (mouse.candleIdx >= 0) {
        const candleX = xCenter(mouse.candleIdx - sIdx);
        const cd = arr[mouse.candleIdx];
        const xLabel = fmtTs(cd.timestamp, detectZoomLevel(c, arr).level, detectZoomLevel(c, arr).spanMs);
        ctx.font = 'bold 10px "SF Mono","Consolas",monospace';
        const xMTextW = ctx.measureText(xLabel).width;
        const xMPadX = 6, xMPadY = 4;
        const xMRectW = xMTextW + xMPadX * 2;
        const xMRectH = 10 + xMPadY * 2;
        const xMX = clamp(candleX - xMRectW / 2, L.left + 2, W - L.right - xMRectW - 2);
        const xMY = H - L.bottom + 4;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.roundRect(xMX, xMY, xMRectW, xMRectH, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(xLabel, candleX, xMY + xMRectH / 2);
      }
    }

    /* ---- Zoom-out hint ---- */
    if (c.count < 3 && arr.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Zoom out to see candles', W / 2, H / 2);
    }

    updateLegend();
  }
  drawRef.current = draw;

  /* ---- Legend ---- */
  function updateLegend() {
    const el = legendRef.current;
    if (!el) return;
    const cc = cur.current;
    const si2 = Math.floor(cc.offset);
    const pats = patternsRef.current;
    const vis = pats.filter(p => {
      const si3 = p.pattern_region.start_index ?? -1;
      const ei3 = p.pattern_region.end_index ?? -1;
      return ei3 >= si2 && si3 < si2 + cc.count;
    });
    if (vis.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = vis.map((p, i) => {
      const cl = PATTERN_COLORS[i % PATTERN_COLORS.length];
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 8px;background:rgba(11,17,32,0.85);border-radius:6px;border:1px solid rgba(255,255,255,0.06);white-space:nowrap">
        <span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:${cl.stroke}"></span>
        <span style="font-size:11px;color:#94a3b8">${p.pattern_name}</span>
      </div>`;
    }).join('');
  }

  /* ------------------------------------------------------------------ */
  /*  Event Handlers                                                     */
  /* ------------------------------------------------------------------ */

  /* ---- Wheel zoom (X-only) ---- */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const arr = dataRef.current;
    if (arr.length === 0) return;

    const cw = rect.width - L.left - L.right;
    const ch = rect.height - L.top - L.bottom;
    const mx = e.clientX - rect.left - L.left;
    const my = e.clientY - rect.top - L.top;

    const t = target.current;

    if (e.ctrlKey || e.metaKey) {
      /* Y-axis zoom only */
      const dataRatioY = clamp(1 - my / ch, 0, 1);
      const centerPrice = t.priceMin + dataRatioY * (t.priceMax - t.priceMin);
      const zoom = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newRange = (t.priceMax - t.priceMin) * zoom;
      t.priceMin = centerPrice - dataRatioY * newRange;
      t.priceMax = t.priceMin + newRange;
    } else if (e.shiftKey) {
      /* Horizontal pan only */
      const cps = t.count / cw;
      const panAmount = e.deltaY * cps * 2;
      t.offset = clamp(t.offset + panAmount, 0, arr.length - t.count);
    } else {
      /* X-axis zoom only (horizontal) */
      const dataRatioX = clamp(mx / cw, 0, 1);
      const centerIdx = t.offset + dataRatioX * t.count;
      const zoom = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      const newCount = clamp(t.count * zoom, MIN_VISIBLE_COUNT, arr.length);
      let newOffset = centerIdx - dataRatioX * newCount;
      newOffset = clamp(newOffset, 0, arr.length - newCount);
      t.offset = newOffset;
      t.count = newCount;
    }

    startAnimating();
  }, []);

  /* ---- Mouse down ---- */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    /* Check trend line click */
    if (trendLineModeRef.current) {
      const arr = dataRef.current;
      if (arr.length === 0) return;
      const c = cur.current;
      const ch = rect.height - L.top - L.bottom;
      const sm = scaleModeRef.current;
      const cw = rect.width - L.left - L.right;
      const sI = Math.floor(c.offset);
      const step = cw / Math.max(1, c.count);
      const xC = (ri: number) => L.left + (ri - (c.offset - sI)) * step + step / 2;
      const yP2 = (pv: number) => yPos(pv, c, ch, sm);

      /* Check existing endpoints */
      const tls = trendLinesRef.current;
      for (const tl of tls) {
        const ri1 = tl.x1 - sI;
        const ri2 = tl.x2 - sI;
        const px1 = xC(ri1), py1 = yP2(tl.y1);
        const px2 = xC(ri2), py2 = yP2(tl.y2);

        const d1 = Math.sqrt((mx - px1) ** 2 + (my - py1) ** 2);
        const d2 = Math.sqrt((mx - px2) ** 2 + (my - py2) ** 2);
        const snapR = CROSSHAIR_SNAP_RADIUS * 2;

        if (d1 < snapR) {
          draggingTL.current = tl.id;
          draggingTLEnd.current = 'start';
          return;
        }
        if (d2 < snapR) {
          draggingTL.current = tl.id;
          draggingTLEnd.current = 'end';
          return;
        }
      }

      /* Start drawing a new trend line */
      if (mx >= L.left && mx <= rect.width - L.right && my >= L.top && my <= L.top + ch) {
        const dataIdx = sI + (mx - L.left) / step;
        if (dataIdx >= 0 && dataIdx < arr.length) {
          const ci = Math.round(dataIdx);
          const price = arr[Math.min(ci, arr.length - 1)].close;
          drawingTL.current = { x: ci, price, y: my };
          return;
        }
      }
    }

    /* Start drag pan */
    const t = target.current;
    const d = drag.current;
    d.active = true;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.startOff = t.offset;
    d.startCount = t.count;
    d.startPMin = t.priceMin;
    d.startPMax = t.priceMax;
    d.history = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    d.verticalLock = false;
    momentum.current.active = false;
  }, []);

  /* ---- Mouse move ---- */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const arr = dataRef.current;
    if (arr.length === 0) return;

    const c = cur.current;
    const cw = rect.width - L.left - L.right;
    const ch = rect.height - L.top - L.bottom;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    /* Update crosshair */
    const inChart = mx >= L.left && mx <= rect.width - L.right && my >= L.top && my <= L.top + ch;
    let candleIdx = -1;
    if (inChart) {
      const sI = Math.floor(c.offset);
      const step = cw / Math.max(1, c.count);
      const dataIdx = sI + (mx - L.left) / step;
      candleIdx = clamp(Math.round(dataIdx), 0, arr.length - 1);
    }
    mouseRef.current = { x: mx, y: my, inChart, candleIdx };
    if (inChart && candleIdx >= 0) {
      const cd = arr[candleIdx];
      setCrosshair({ x: mx, y: my, candleIdx, ohlc: cd, ts: String(cd.timestamp) });
    } else {
      setCrosshair(null);
    }

    /* Trend line: hover & dragging endpoint */
    if (trendLineModeRef.current) {
      const sI2 = Math.floor(c.offset);
      const step2 = cw / Math.max(1, c.count);
      const xC2 = (ri: number) => L.left + (ri - (c.offset - sI2)) * step2 + step2 / 2;
      const yP2 = (pv: number) => yPos(pv, c, ch, scaleModeRef.current);

      if (draggingTL.current && draggingTLEnd.current) {
        const tls = [...trendLinesRef.current];
        const tl = tls.find(t2 => t2.id === draggingTL.current);
        if (tl && inChart) {
          const dataIdx2 = sI2 + (mx - L.left) / step2;
          const ci = clamp(Math.round(dataIdx2), 0, arr.length - 1);
          const snappedPrice = arr[ci].close;
          const distHigh = Math.abs(my - yP2(arr[ci].high));
          const distLow = Math.abs(my - yP2(arr[ci].low));
          const distClose = Math.abs(my - yP2(arr[ci].close));
          const snapPrice = distHigh < distLow && distHigh < distClose ? arr[ci].high
            : distLow < distClose ? arr[ci].low : arr[ci].close;
          const px = xC2(dataIdx2);
          const snapDist = Math.abs(my - yP2(snapPrice));
          const finalPrice = snapDist < 15 ? snapPrice : arr[ci].close;
          if (draggingTLEnd.current === 'start') { tl.x1 = ci; tl.y1 = finalPrice; }
          else { tl.x2 = ci; tl.y2 = finalPrice; }
          trendLinesRef.current = tls;
          if (onTrendLinesChange) onTrendLinesChange(tls);
          drawRef.current();
        }
        return;
      }

      /* Hover detection */
      let foundHover: string | null = null;
      for (const tl of trendLinesRef.current) {
        const ri1 = tl.x1 - sI2;
        const ri2 = tl.x2 - sI2;
        const px1 = xC2(ri1), py1 = yP2(tl.y1);
        const px2 = xC2(ri2), py2 = yP2(tl.y2);
        const d1 = Math.sqrt((mx - px1) ** 2 + (my - py1) ** 2);
        const d2 = Math.sqrt((mx - px2) ** 2 + (my - py2) ** 2);
        if (d1 < 12 || d2 < 12) { foundHover = tl.id; break; }
      }
      if (foundHover !== hoverTL.current) {
        hoverTL.current = foundHover;
        drawRef.current();
      }
    }

    /* Drag pan */
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const t = target.current;
    const cps = d.startCount / cw;
    const pps = (d.startPMax - d.startPMin) / ch;

    t.offset = clamp(d.startOff - dx * cps, 0, arr.length - d.startCount);
    t.count = d.startCount;

    if (!d.verticalLock) {
      t.priceMin = d.startPMin + dy * pps;
      t.priceMax = d.startPMax + dy * pps;
    }

    /* Apply immediately to cur so axis labels update during drag */
    c.offset = t.offset;
    c.count = t.count;
    c.priceMin = t.priceMin;
    c.priceMax = t.priceMax;

    d.history.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (d.history.length > 6) d.history.shift();
    momentum.current.active = false;
    animating.current = false;

    drawRef.current();
  }, [onTrendLinesChange]);

  /* ---- Mouse up ---- */
  const handleMouseUp = useCallback(() => {
    const d = drag.current;

    if (drawingTL.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const arr = dataRef.current;
        const c = cur.current;
        if (arr.length > 0 && mouseRef.current.inChart) {
          const mx = mouseRef.current.x;
          const cw = rect.width - L.left - L.right;
          const sI = Math.floor(c.offset);
          const step = cw / Math.max(1, c.count);
          const dataIdx = sI + (mx - L.left) / step;
          const ci = clamp(Math.round(dataIdx), 0, arr.length - 1);
          if (ci !== drawingTL.current.x) {
            const newTL: TrendLine = {
              id: `tl-${Date.now()}`,
              x1: drawingTL.current.x,
              y1: drawingTL.current.price,
              x2: ci,
              y2: arr[ci].close,
              color: TREND_COLORS[trendLinesRef.current.length % TREND_COLORS.length],
            };
            const updated = [...trendLinesRef.current, newTL];
            trendLinesRef.current = updated;
            if (onTrendLinesChange) onTrendLinesChange(updated);
          }
        }
      }
      drawingTL.current = null;
      drawRef.current();
    }

    if (!d.active) { draggingTL.current = null; draggingTLEnd.current = null; return; }
    d.active = false;

    if (d.history.length >= 2 && !d.verticalLock) {
      const first = d.history[0];
      const last = d.history[d.history.length - 1];
      const dt = last.t - first.t;
      if (dt > 0) {
        const vx = ((last.x - first.x) / dt) * 16;
        const vy = ((last.y - first.y) / dt) * 16;
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 0.3) {
          momentum.current.vx = vx * 0.6;
          momentum.current.vy = vy * 0.6;
          momentum.current.active = true;
          if (!rafId.current) rafId.current = requestAnimationFrame(tick);
        }
      }
    }
    d.history = [];
    draggingTL.current = null;
    draggingTLEnd.current = null;
  }, [onTrendLinesChange]);

  /* ---- Context menu (delete trend line) ---- */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const c = cur.current;
    const ch = rect.height - L.top - L.bottom;
    const cw = rect.width - L.left - L.right;
    const sI = Math.floor(c.offset);
    const step = cw / Math.max(1, c.count);
    const xC = (ri: number) => L.left + (ri - (c.offset - sI)) * step + step / 2;
    const yP2 = (pv: number) => yPos(pv, c, ch, scaleModeRef.current);

    for (const tl of trendLinesRef.current) {
      const ri1 = tl.x1 - sI, ri2 = tl.x2 - sI;
      const px1 = xC(ri1), py1 = yP2(tl.y1);
      const px2 = xC(ri2), py2 = yP2(tl.y2);
      const d1 = Math.sqrt((mx - px1) ** 2 + (my - py1) ** 2);
      const d2 = Math.sqrt((mx - px2) ** 2 + (my - py2) ** 2);
      if (d1 < 12 || d2 < 12) {
        const updated = trendLinesRef.current.filter(t => t.id !== tl.id);
        trendLinesRef.current = updated;
        if (onTrendLinesChange) onTrendLinesChange(updated);
        drawRef.current();
        return;
      }
    }
  }, [onTrendLinesChange]);

  /* ---- Touch support ---- */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = t.clientX - rect.left;
      const my = t.clientY - rect.top;

      if (trendLineModeRef.current) {
        const arr = dataRef.current;
        if (arr.length === 0) return;
        const c = cur.current;
        const cw = rect.width - L.left - L.right;
        const sI = Math.floor(c.offset);
        const step = cw / Math.max(1, c.count);
        if (mx >= L.left && mx <= rect.width - L.right && my >= L.top && my <= L.top + (rect.height - L.top - L.bottom)) {
          const dataIdx = sI + (mx - L.left) / step;
          if (dataIdx >= 0 && dataIdx < arr.length) {
            const ci = Math.round(dataIdx);
            if (!drawingTL.current) {
              drawingTL.current = { x: ci, price: arr[Math.min(ci, arr.length - 1)].close, y: my };
            } else if (ci !== drawingTL.current.x) {
              const newTL: TrendLine = {
                id: `tl-${Date.now()}`,
                x1: drawingTL.current.x,
                y1: drawingTL.current.price,
                x2: ci,
                y2: arr[ci].close,
                color: TREND_COLORS[trendLinesRef.current.length % TREND_COLORS.length],
              };
              const updated = [...trendLinesRef.current, newTL];
              trendLinesRef.current = updated;
              if (onTrendLinesChange) onTrendLinesChange(updated);
              drawingTL.current = null;
              drawRef.current();
              return;
            }
            drawRef.current();
            return;
          }
        }
      }

      drag.current.active = true;
      drag.current.startX = t.clientX;
      drag.current.startY = t.clientY;
      drag.current.startOff = target.current.offset;
      drag.current.startCount = target.current.count;
      drag.current.startPMin = target.current.priceMin;
      drag.current.startPMax = target.current.priceMax;
      drag.current.history = [{ x: t.clientX, y: t.clientY, t: performance.now() }];
      drag.current.verticalLock = false;
      momentum.current.active = false;
    } else if (e.touches.length === 2) {
      /* Pinch zoom */
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      lastPinchDist.current = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
    }
  }, [onTrendLinesChange]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      /* Pinch zoom */
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2);
      if (lastPinchDist.current > 0) {
        const ratio = dist / lastPinchDist.current;
        const t = target.current;
        const arr = dataRef.current;
        const newCount = clamp(t.count / ratio, MIN_VISIBLE_COUNT, arr.length);
        const centerIdx = t.offset + t.count / 2;
        let newOffset = centerIdx - newCount / 2;
        newOffset = clamp(newOffset, 0, arr.length - newCount);
        t.offset = newOffset;
        t.count = newCount;
        startAnimating();
      }
      lastPinchDist.current = dist;
      return;
    }

    if (e.touches.length !== 1 || !drag.current.active) return;
    e.preventDefault();
    const t = e.touches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const arr = dataRef.current;
    if (arr.length === 0) return;

    /* Update crosshair */
    const mx = t.clientX - rect.left;
    const my = t.clientY - rect.top;
    const c = cur.current;
    const cw = rect.width - L.left - L.right;
    const ch = rect.height - L.top - L.bottom;
    const inChart = mx >= L.left && mx <= rect.width - L.right && my >= L.top && my <= L.top + ch;
    let ci = -1;
    if (inChart) {
      const sI = Math.floor(c.offset);
      const step = cw / Math.max(1, c.count);
      ci = clamp(Math.round(sI + (mx - L.left) / step), 0, arr.length - 1);
    }
    mouseRef.current = { x: mx, y: my, inChart, candleIdx: ci };

    /* Drag */
    const dx = t.clientX - drag.current.startX;
    const dy = t.clientY - drag.current.startY;
    const tar = target.current;
    const cps = drag.current.startCount / cw;
    const pps = (drag.current.startPMax - drag.current.startPMin) / ch;
    tar.offset = clamp(drag.current.startOff - dx * cps, 0, arr.length - drag.current.startCount);
    if (!drag.current.verticalLock) {
      tar.priceMin = drag.current.startPMin + dy * pps;
      tar.priceMax = drag.current.startPMax + dy * pps;
    }
    /* Apply immediately to cur so axis labels update during drag */
    c.offset = tar.offset;
    c.count = tar.count;
    c.priceMin = tar.priceMin;
    c.priceMax = tar.priceMax;

    drag.current.history.push({ x: t.clientX, y: t.clientY, t: performance.now() });
    if (drag.current.history.length > 6) drag.current.history.shift();

    drawRef.current();
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (drag.current.active) handleMouseUp();
    lastPinchDist.current = 0;
  }, [handleMouseUp]);

  /* ---- Last price ---- */
  const arr = dataRef.current;
  const lastPrice = arr.length > 0 ? arr[arr.length - 1].close : 0;
  const prevPrice2 = arr.length > 1 ? arr[arr.length - 2].close : lastPrice;
  const priceChg = lastPrice - prevPrice2;
  const chgPct = prevPrice2 ? (priceChg / prevPrice2) * 100 : 0;

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'v' || e.key === 'V') setVerticalLock(v => !v);
      if (e.key === 't' || e.key === 'T') { setTrendLineMode(v => !v); e.preventDefault(); }
      if (e.key === 'a' || e.key === 'A') { handleAutoScale(); e.preventDefault(); }
      if (e.key === 'Escape') { drawingTL.current = null; drawRef.current(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAutoScale]);

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Price indicator */}
      <div className="pointer-events-none absolute left-[72px] top-[4px] z-10 flex items-baseline gap-2">
        <span className="text-base font-bold text-white">{fmtPrice(lastPrice)}</span>
        <span className={`text-xs font-medium ${priceChg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {priceChg >= 0 ? '+' : ''}{fmtPrice(priceChg)} ({priceChg >= 0 ? '+' : ''}{chgPct.toFixed(2)}%)
        </span>
        {scaleMode === 'log' && <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">LOG</span>}
      </div>

      {/* Legend */}
      <div ref={legendRef} className="pointer-events-none absolute right-2 top-1 z-10 flex flex-col gap-1" />

      {/* Trend line mode badge */}
      {trendLineMode && (
        <div className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2">
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[11px] text-blue-300">
            Trend Line Mode — Click to draw · Right-click to delete
          </span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {/* Bottom info bar */}
      {data.length > 0 && (
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] text-slate-600">
          <span>Scroll to zoom</span>
          <span>Ctrl+Scroll for price zoom</span>
          <span>Drag to pan</span>
          <span>V: toggle vertical lock</span>
          <span>A: auto-scale</span>
        </div>
      )}
    </div>
  );
}
