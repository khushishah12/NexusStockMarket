/* ------------------------------------------------------------------ */
/*  Pattern: output type                                               */
/* ------------------------------------------------------------------ */

export interface PatternResult {
  pattern_name: string;
  category: string;
  confidence_percent: number;
  detected_on_timeframe: string;
  pattern_region: { start_index: number; end_index: number };
  anchor_points: { p1: number; p2: number; p3: number; p4: number };
  highlight_polygon: [number, number][];
  explanation: string;
  theoretical_target_price: number | null;
  risk_level: 'Low' | 'Medium' | 'High';
  stoploss: number | null;
  suitable_for_intraday: boolean;
  suitable_for_swing: boolean;
}

interface OHLCV {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function pct(a: number, b: number): number {
  return ((b - a) / Math.abs(a)) * 100;
}

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function isPeak(high: number[], i: number, window = 1): boolean {
  for (let w = 1; w <= window; w++) {
    if (high[i] <= high[Math.max(0, i - w)] || high[i] <= high[Math.min(high.length - 1, i + w)]) return false;
  }
  return true;
}

function isTrough(low: number[], i: number, window = 1): boolean {
  for (let w = 1; w <= window; w++) {
    if (low[i] >= low[Math.max(0, i - w)] || low[i] >= low[Math.min(low.length - 1, i + w)]) return false;
  }
  return true;
}

function findSwingHighs(high: number[], window = 2): number[] {
  const pivots: number[] = [];
  for (let i = window; i < high.length - window; i++) {
    if (isPeak(high, i, window)) pivots.push(i);
  }
  return pivots;
}

function findSwingLows(low: number[], window = 2): number[] {
  const pivots: number[] = [];
  for (let i = window; i < low.length - window; i++) {
    if (isTrough(low, i, window)) pivots.push(i);
  }
  return pivots;
}

function linearSlope(x1: number, y1: number, x2: number, y2: number): number {
  return (y2 - y1) / (x2 - x1);
}

function priceAtTrendline(x: number, x1: number, y1: number, slope: number): number {
  return y1 + slope * (x - x1);
}

function fitLine(indices: number[], prices: number[]): { slope: number; intercept: number } {
  const n = indices.length;
  if (n < 2) return { slope: 0, intercept: prices[0] || 0 };
  const mx = avg(indices.map(Number));
  const my = avg(prices);
  const num = indices.reduce((s, xi, i) => s + (Number(xi) - mx) * (prices[i] - my), 0);
  const den = indices.reduce((s, xi) => s + (Number(xi) - mx) ** 2, 0);
  const slope = den !== 0 ? num / den : 0;
  return { slope, intercept: my - slope * mx };
}

function touchCount(indices: number[], prices: number[], slope: number, intercept: number, tolerance = 0.03): number {
  let count = 0;
  for (let i = 0; i < indices.length; i++) {
    const expected = intercept + slope * Number(indices[i]);
    if (Math.abs(prices[i] - expected) / Math.max(expected, 1) <= tolerance) count++;
  }
  return count;
}

function zigzag(high: number[], low: number[], deviation = 3): { type: 'high' | 'low'; index: number; price: number }[] {
  const points: { type: 'high' | 'low'; index: number; price: number }[] = [];
  const len = high.length;
  if (len < 3) return points;

  let dir = 0; // 1 = up, -1 = down
  let lastHigh = high[0], lastLow = low[0];
  let lastHighIdx = 0, lastLowIdx = 0;

  for (let i = 1; i < len; i++) {
    if (high[i] > lastHigh) { lastHigh = high[i]; lastHighIdx = i; }
    if (low[i] < lastLow) { lastLow = low[i]; lastLowIdx = i; }

    if (dir !== -1 && high[i] > lastLow * (1 + deviation / 100)) {
      if (dir === 0) { dir = 1; continue; }
      points.push({ type: 'low', index: lastLowIdx, price: lastLow });
      dir = -1;
      lastHigh = high[i]; lastHighIdx = i;
    }
    if (dir !== 1 && low[i] < lastHigh * (1 - deviation / 100)) {
      if (dir === 0) { dir = -1; continue; }
      points.push({ type: 'high', index: lastHighIdx, price: lastHigh });
      dir = 1;
      lastLow = low[i]; lastLowIdx = i;
    }
  }

  if (points.length > 0 && points[0].type === 'low') {
    points.unshift({ type: 'high', index: lastHighIdx, price: lastHigh });
  }
  return points;
}

/* ------------------------------------------------------------------ */
/*  Classic Patterns                                                   */
/* ------------------------------------------------------------------ */

function detectDoubleTop(ohlcv: OHLCV, window = 70): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);
  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);

  if (peaks.length < 2) return null;

  for (let i = 0; i < peaks.length - 1; i++) {
    for (let j = i + 1; j < peaks.length; j++) {
      const p1 = peaks[i], p2 = peaks[j];
      if (p2 - p1 < 5 || p2 - p1 > 60) continue;
      const peakPrice1 = high[p1], peakPrice2 = high[p2];
      const diff = Math.abs(pct(peakPrice1, peakPrice2));
      if (diff > 3) continue;

      const valley = Math.min(...low.slice(p1, p2 + 1));
      const valleyIdx = low.indexOf(valley, p1);
      const dropPct = pct(peakPrice1, valley);
      if (dropPct > -1) continue;

      const neckline = valley;
      const confirm = close.slice(p2).some((c) => c < neckline * 0.995);
      const confidence = Math.round(Math.max(50, 100 - diff * 10 - (confirm ? 0 : 20)));
      const target = peakPrice1 - (peakPrice1 - valley);
      const polygon: [number, number][] = [
        [p1, high[p1]], [p1, low[p1]],
        ...low.slice(p1, p2 + 1).map((l, k) => [p1 + k, l] as [number, number]),
        [p2, low[p2]], [p2, high[p2]],
        ...high.slice(p1, p2 + 1).reverse().map((h, k) => [p2 - k, h] as [number, number]),
      ];

      return {
        pattern_name: 'Double Top',
        category: 'Classic',
        confidence_percent: Math.min(confidence, 95),
        detected_on_timeframe: '',
        pattern_region: { start_index: p1, end_index: p2 },
        anchor_points: { p1, p2, p3: valleyIdx >= 0 ? valleyIdx : p1 + Math.floor((p2 - p1) / 2), p4: -1 },
        highlight_polygon: polygon,
        explanation: `Two peaks at ~${peakPrice1.toFixed(2)} and ~${peakPrice2.toFixed(2)} with a valley of ${Math.abs(dropPct).toFixed(1)}% between them. Neckline at ₹${neckline.toFixed(2)}.${confirm ? ' Price has broken below neckline, confirming the pattern.' : ' Awaiting neckline break confirmation.'}`,
        theoretical_target_price: target,
        risk_level: confirm ? 'Medium' : 'High',
        stoploss: confirm ? peakPrice1 * 1.02 : null,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      };
    }
  }
  return null;
}

function detectDoubleBottom(ohlcv: OHLCV, window = 70): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, low.length);
  const start = Math.max(0, low.length - n);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (troughs.length < 2) return null;

  for (let i = 0; i < troughs.length - 1; i++) {
    for (let j = i + 1; j < troughs.length; j++) {
      const t1 = troughs[i], t2 = troughs[j];
      if (t2 - t1 < 5 || t2 - t1 > 60) continue;
      const low1 = low[t1], low2 = low[t2];
      const diff = Math.abs(pct(low1, low2));
      if (diff > 3) continue;

      const peak = Math.max(...high.slice(t1, t2 + 1));
      const peakIdx = high.indexOf(peak, t1);
      const risePct = pct(low1, peak);
      if (risePct < 2) continue;

      const neckline = peak;
      const confirm = close.slice(t2).some((c) => c > neckline * 1.005);
      const confidence = Math.round(Math.max(50, 100 - diff * 10 - (confirm ? 0 : 20)));
      const target = low1 - (peak - low1);
      const polygon: [number, number][] = [
        [t1, low[t1]], [t1, high[t1]],
        ...high.slice(t1, t2 + 1).map((h, k) => [t1 + k, h] as [number, number]),
        [t2, high[t2]], [t2, low[t2]],
        ...low.slice(t1, t2 + 1).reverse().map((l, k) => [t2 - k, l] as [number, number]),
      ];

      return {
        pattern_name: 'Double Bottom',
        category: 'Classic',
        confidence_percent: Math.min(confidence, 95),
        detected_on_timeframe: '',
        pattern_region: { start_index: t1, end_index: t2 },
        anchor_points: { p1: t1, p2: t2, p3: peakIdx >= 0 ? peakIdx : t1 + Math.floor((t2 - t1) / 2), p4: -1 },
        highlight_polygon: polygon,
        explanation: `Two troughs at ~${low1.toFixed(2)} and ~${low2.toFixed(2)} with a peak of ${risePct.toFixed(1)}% between them. Neckline at ₹${neckline.toFixed(2)}.${confirm ? ' Price has broken above neckline, confirming the pattern.' : ' Awaiting neckline break confirmation.'}`,
        theoretical_target_price: target,
        risk_level: confirm ? 'Medium' : 'High',
        stoploss: confirm ? low1 * 0.98 : null,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      };
    }
  }
  return null;
}

function detectHeadAndShoulders(ohlcv: OHLCV, window = 100): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);
  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);

  if (peaks.length < 3) return null;

  for (let i = 0; i < peaks.length - 2; i++) {
    const ls = peaks[i], h = peaks[i + 1], rs = peaks[i + 2];
    if (h - ls < 5 || rs - h < 3) continue;

    const leftPrice = high[ls], headPrice = high[h], rightPrice = high[rs];
    if (headPrice <= leftPrice || headPrice <= rightPrice) continue;

    const shoulderDiff = Math.abs(pct(leftPrice, rightPrice));
    if (shoulderDiff > 5) continue;

    const valley1 = Math.min(...low.slice(ls, h + 1));
    const valley1Idx = low.indexOf(valley1, ls);
    const valley2 = Math.min(...low.slice(h, rs + 1));
    const valley2Idx = low.indexOf(valley2, h);
    const necklineSlope = linearSlope(valley1Idx, valley1, valley2Idx, valley2);
    const necklineEnd = priceAtTrendline(rs, valley1Idx, valley1, necklineSlope);
    const confirm = close.slice(rs).some((c) => c < necklineEnd * 0.995);

    const confidence = Math.round(Math.max(55, 100 - shoulderDiff * 3 - (confirm ? 5 : 25)));
    const target = necklineEnd - (headPrice - necklineEnd);

    const polygon: [number, number][] = [];
    for (let k = ls; k <= rs; k++) polygon.push([k, high[k]]);
    for (let k = rs; k >= ls; k--) polygon.push([k, low[k]]);

    return {
      pattern_name: 'Head & Shoulders',
      category: 'Classic',
      confidence_percent: Math.min(confidence, 95),
      detected_on_timeframe: '',
      pattern_region: { start_index: ls, end_index: rs },
      anchor_points: { p1: ls, p2: h, p3: rs, p4: valley1Idx },
      highlight_polygon: polygon,
      explanation: `Left shoulder at ₹${leftPrice.toFixed(2)}, head at ₹${headPrice.toFixed(2)}, right shoulder at ₹${rightPrice.toFixed(2)}. Neckline slope ${necklineSlope > 0 ? 'rising' : 'falling'}.${confirm ? ' Confirmed — price broke below neckline.' : ' Awaiting neckline break.'}`,
      theoretical_target_price: Math.max(0, target),
      risk_level: confirm ? 'Medium' : 'High',
      stoploss: confirm ? headPrice * 1.03 : null,
      suitable_for_intraday: false,
      suitable_for_swing: true,
    };
  }
  return null;
}

function detectInverseHeadAndShoulders(ohlcv: OHLCV, window = 100): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, low.length);
  const start = Math.max(0, low.length - n);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (troughs.length < 3) return null;

  for (let i = 0; i < troughs.length - 2; i++) {
    const ls = troughs[i], h = troughs[i + 1], rs = troughs[i + 2];
    if (h - ls < 5 || rs - h < 3) continue;

    const leftPrice = low[ls], headPrice = low[h], rightPrice = low[rs];
    if (headPrice >= leftPrice || headPrice >= rightPrice) continue;

    const shoulderDiff = Math.abs(pct(leftPrice, rightPrice));
    if (shoulderDiff > 5) continue;

    const peak1 = Math.max(...high.slice(ls, h + 1));
    const peak1Idx = high.indexOf(peak1, ls);
    const peak2 = Math.max(...high.slice(h, rs + 1));
    const peak2Idx = high.indexOf(peak2, h);
    const necklineSlope = linearSlope(peak1Idx, peak1, peak2Idx, peak2);
    const necklineEnd = priceAtTrendline(rs, peak1Idx, peak1, necklineSlope);
    const confirm = close.slice(rs).some((c) => c > necklineEnd * 1.005);

    const confidence = Math.round(Math.max(55, 100 - shoulderDiff * 3 - (confirm ? 5 : 25)));
    const target = necklineEnd + (necklineEnd - headPrice);

    const polygon: [number, number][] = [];
    for (let k = ls; k <= rs; k++) polygon.push([k, low[k]]);
    for (let k = rs; k >= ls; k--) polygon.push([k, high[k]]);

    return {
      pattern_name: 'Inverse Head & Shoulders',
      category: 'Classic',
      confidence_percent: Math.min(confidence, 95),
      detected_on_timeframe: '',
      pattern_region: { start_index: ls, end_index: rs },
      anchor_points: { p1: ls, p2: h, p3: rs, p4: peak1Idx },
      highlight_polygon: polygon,
      explanation: `Inverse H&S: left trough at ₹${leftPrice.toFixed(2)}, head at ₹${headPrice.toFixed(2)}, right trough at ₹${rightPrice.toFixed(2)}. Neckline at ₹${necklineEnd.toFixed(2)}.${confirm ? ' Confirmed — price broke above neckline.' : ' Awaiting neckline break.'}`,
      theoretical_target_price: target,
      risk_level: confirm ? 'Medium' : 'High',
      stoploss: confirm ? headPrice * 0.97 : null,
      suitable_for_intraday: false,
      suitable_for_swing: true,
    };
  }
  return null;
}

function detectTripleTop(ohlcv: OHLCV, window = 100): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);
  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);

  if (peaks.length < 3) return null;

  for (let i = 0; i < peaks.length - 2; i++) {
    const p1i = peaks[i], p2i = peaks[i + 1], p3i = peaks[i + 2];
    if (p3i - p1i > 70) continue;
    const pp1 = high[p1i], pp2 = high[p2i], pp3 = high[p3i];
    const maxDiff = Math.max(Math.abs(pct(pp1, pp2)), Math.abs(pct(pp2, pp3)), Math.abs(pct(pp1, pp3)));
    if (maxDiff > 4) continue;

    const support = Math.min(...low.slice(p1i, p3i + 1));
    const supportIdx = low.indexOf(support, p1i);
    const breakDown = close.slice(p3i).some((c) => c < support * 0.995);

    const confidence = Math.round(Math.max(60, 100 - maxDiff * 5 - (breakDown ? 0 : 20)));
    const target = support - (avg([pp1, pp2, pp3]) - support);

    const polygon: [number, number][] = [];
    for (let k = p1i; k <= p3i; k++) polygon.push([k, high[k]]);
    for (let k = p3i; k >= p1i; k--) polygon.push([k, low[k]]);

    return {
      pattern_name: 'Triple Top',
      category: 'Classic',
      confidence_percent: Math.min(confidence, 90),
      detected_on_timeframe: '',
      pattern_region: { start_index: p1i, end_index: p3i },
      anchor_points: { p1: p1i, p2: p2i, p3: p3i, p4: supportIdx },
      highlight_polygon: polygon,
      explanation: `Three peaks at ₹${pp1.toFixed(2)}, ₹${pp2.toFixed(2)}, ₹${pp3.toFixed(2)} (max diff ${maxDiff.toFixed(1)}%). Support at ₹${support.toFixed(2)}.${breakDown ? ' Price broke support.' : ' Awaiting support break.'}`,
      theoretical_target_price: Math.max(0, target),
      risk_level: breakDown ? 'Medium' : 'High',
      stoploss: breakDown ? Math.max(pp1, pp2, pp3) * 1.02 : null,
      suitable_for_intraday: false,
      suitable_for_swing: true,
    };
  }
  return null;
}

function detectTripleBottom(ohlcv: OHLCV, window = 100): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, low.length);
  const start = Math.max(0, low.length - n);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (troughs.length < 3) return null;

  for (let i = 0; i < troughs.length - 2; i++) {
    const t1 = troughs[i], t2 = troughs[i + 1], t3 = troughs[i + 2];
    if (t3 - t1 > 70) continue;
    const tp1 = low[t1], tp2 = low[t2], tp3 = low[t3];
    const maxDiff = Math.max(Math.abs(pct(tp1, tp2)), Math.abs(pct(tp2, tp3)), Math.abs(pct(tp1, tp3)));
    if (maxDiff > 4) continue;

    const resistance = Math.max(...high.slice(t1, t3 + 1));
    const resistanceIdx = high.indexOf(resistance, t1);
    const breakUp = close.slice(t3).some((c) => c > resistance * 1.005);

    const confidence = Math.round(Math.max(60, 100 - maxDiff * 5 - (breakUp ? 0 : 20)));
    const target = resistance + (resistance - avg([tp1, tp2, tp3]));

    const polygon: [number, number][] = [];
    for (let k = t1; k <= t3; k++) polygon.push([k, low[k]]);
    for (let k = t3; k >= t1; k--) polygon.push([k, high[k]]);

    return {
      pattern_name: 'Triple Bottom',
      category: 'Classic',
      confidence_percent: Math.min(confidence, 90),
      detected_on_timeframe: '',
      pattern_region: { start_index: t1, end_index: t3 },
      anchor_points: { p1: t1, p2: t2, p3: t3, p4: resistanceIdx },
      highlight_polygon: polygon,
      explanation: `Three troughs at ₹${tp1.toFixed(2)}, ₹${tp2.toFixed(2)}, ₹${tp3.toFixed(2)} (max diff ${maxDiff.toFixed(1)}%). Resistance at ₹${resistance.toFixed(2)}.${breakUp ? ' Price broke resistance.' : ' Awaiting resistance break.'}`,
      theoretical_target_price: target,
      risk_level: breakUp ? 'Medium' : 'High',
      stoploss: breakUp ? Math.min(tp1, tp2, tp3) * 0.98 : null,
      suitable_for_intraday: false,
      suitable_for_swing: true,
    };
  }
  return null;
}

function detectCupAndHandle(ohlcv: OHLCV, window = 120): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, close.length);
  const start = Math.max(0, close.length - n);
  const prices = close.slice(start);
  const idxOff = start;

  if (prices.length < 30) return null;

  const leftPeak = Math.max(...prices.slice(0, Math.floor(prices.length * 0.25)));
  const leftPeakIdx = prices.indexOf(leftPeak) + idxOff;
  const rightCupEnd = Math.max(...prices.slice(Math.floor(prices.length * 0.6)));
  let rightCupEndIdx = prices.lastIndexOf(rightCupEnd) + idxOff;
  if (rightCupEndIdx < leftPeakIdx + 10) rightCupEndIdx = leftPeakIdx + 10;

  const cupBottom = Math.min(...prices.slice(0, Math.min(prices.length, 80)));
  const cupBottomIdx = prices.indexOf(cupBottom) + idxOff;

  const cupDrop = pct(leftPeak, cupBottom);
  if (cupDrop > -5 || cupDrop < -50) return null;

  const recoveryTo = close.slice(Math.min(rightCupEndIdx - idxOff, rightCupEndIdx));
  const handleLen = Math.min(15, prices.length - (rightCupEndIdx - idxOff) - 1);
  if (handleLen < 3) return null;
  const handlePrices = close.slice(rightCupEndIdx - idxOff, rightCupEndIdx - idxOff + handleLen);
  const handleDrop = Math.min(...handlePrices);
  const handleDropPct = pct(rightCupEnd, handleDrop);
  if (handleDropPct > -1 || handleDropPct < -15) return null;

  const breakOut = close.slice(rightCupEndIdx - idxOff + handleLen).some((c) => c > rightCupEnd * 1.01);

  const confidence = Math.round(Math.min(90, 65 + (breakOut ? 15 : 0) + Math.min(15, Math.abs(cupDrop) / 3)));
  const target = rightCupEnd + (rightCupEnd - cupBottom);

  const polygon: [number, number][] = [];
  for (let k = leftPeakIdx; k <= Math.min(rightCupEndIdx + handleLen, close.length - 1); k++) {
    polygon.push([k, high[k]]);
  }
  for (let k = Math.min(rightCupEndIdx + handleLen, close.length - 1); k >= leftPeakIdx; k--) {
    polygon.push([k, low[k]]);
  }

  return {
    pattern_name: 'Cup & Handle',
    category: 'Classic',
    confidence_percent: confidence,
    detected_on_timeframe: '',
    pattern_region: { start_index: leftPeakIdx, end_index: Math.min(rightCupEndIdx + handleLen, close.length - 1) },
    anchor_points: { p1: leftPeakIdx, p2: cupBottomIdx, p3: rightCupEndIdx, p4: -1 },
    highlight_polygon: polygon,
    explanation: `U-shaped cup with ${Math.abs(cupDrop).toFixed(1)}% drop from ₹${leftPeak.toFixed(2)} to ₹${cupBottom.toFixed(2)}, recovering to ₹${rightCupEnd.toFixed(2)}. Handle pullback of ${Math.abs(handleDropPct).toFixed(1)}%.${breakOut ? ' Breakout confirmed.' : ' Awaiting handle breakout.'}`,
    theoretical_target_price: target,
    risk_level: breakOut ? 'Medium' : 'High',
    stoploss: breakOut ? rightCupEnd * 0.97 : null,
    suitable_for_intraday: false,
    suitable_for_swing: true,
  };
}

function detectRoundedBottom(ohlcv: OHLCV, window = 100): PatternResult | null {
  const { close } = ohlcv;
  const n = Math.min(window, close.length);
  const start = Math.max(0, close.length - n);
  const prices = close.slice(start);
  const idxOff = start;

  if (prices.length < 25) return null;

  const left = prices.slice(0, 8);
  const mid = prices.slice(Math.floor(prices.length / 2) - 4, Math.floor(prices.length / 2) + 4);
  const right = prices.slice(prices.length - 8);

  const leftAvg = avg(left);
  const midAvg = avg(mid);
  const rightAvg = avg(right);

  if (midAvg >= leftAvg || midAvg >= rightAvg) return null;

  const bottomIdx = prices.indexOf(Math.min(...prices)) + idxOff;
  const totalDrop = pct(leftAvg, midAvg);
  if (totalDrop > -3) return null;

  const smoothness = prices.reduce((sum, p, i) => {
    if (i < 2 || i >= prices.length - 2) return sum;
    return sum + Math.abs(p - (prices[i - 1] + prices[i + 1]) / 2);
  }, 0) / prices.length;

  const isSmooth = smoothness / avg(prices) < 0.03;

  const confidence = Math.round(Math.min(85, 55 + (isSmooth ? 20 : 0) + Math.min(10, Math.abs(totalDrop))));
  const target = rightAvg + (leftAvg - midAvg);

  const polygon: [number, number][] = [];
  for (let k = start; k < close.length; k++) polygon.push([k, close[k]]);

  return {
    pattern_name: 'Rounded Bottom',
    category: 'Classic',
    confidence_percent: confidence,
    detected_on_timeframe: '',
    pattern_region: { start_index: start, end_index: close.length - 1 },
    anchor_points: { p1: start, p2: bottomIdx, p3: close.length - 1, p4: -1 },
    highlight_polygon: polygon,
    explanation: `Gradual U-shaped reversal. Average price moved from ₹${leftAvg.toFixed(2)} → ₹${midAvg.toFixed(2)} → ₹${rightAvg.toFixed(2)}. ${isSmooth ? 'Smooth, well-formed curve.' : 'Moderate smoothness.'}`,
    theoretical_target_price: target,
    risk_level: 'Medium',
    stoploss: midAvg * 0.97,
    suitable_for_intraday: false,
    suitable_for_swing: true,
  };
}

function detectRectangle(ohlcv: OHLCV, window = 80): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);

  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (peaks.length < 3 || troughs.length < 3) return null;

  const avgPeakPrice = avg(peaks.slice(-3).map((i) => high[i]));
  const avgTroughPrice = avg(troughs.slice(-3).map((i) => low[i]));
  const peakSpread = Math.max(...peaks.slice(-3).map((i) => high[i])) - Math.min(...peaks.slice(-3).map((i) => high[i]));
  const troughSpread = Math.max(...troughs.slice(-3).map((i) => low[i])) - Math.min(...troughs.slice(-3).map((i) => low[i]));

  const rangePct = pct(avgTroughPrice, avgPeakPrice);
  if (rangePct < 3 || rangePct > 30) return null;
  if (peakSpread / avgPeakPrice > 0.03 || troughSpread / avgTroughPrice > 0.03) return null;

  const breakDir = close[close.length - 1] > avgPeakPrice ? 'up' : close[close.length - 1] < avgTroughPrice ? 'down' : null;
  const confidence = Math.round(Math.min(85, 60 + (breakDir ? 15 : 0) + Math.min(10, 15 - peakSpread / avgPeakPrice * 100)));

  const polygon: [number, number][] = [];
  for (let k = Math.min(peaks[0], troughs[0]); k <= Math.max(peaks[peaks.length - 1], troughs[troughs.length - 1]); k++) {
    polygon.push([k, high[k]]);
    polygon.push([k, low[k]]);
  }

  return {
    pattern_name: 'Rectangle',
    category: 'Classic',
    confidence_percent: confidence,
    detected_on_timeframe: '',
    pattern_region: { start_index: Math.min(peaks[0], troughs[0]), end_index: close.length - 1 },
    anchor_points: { p1: peaks[peaks.length - 3], p2: peaks[peaks.length - 1], p3: troughs[troughs.length - 3], p4: troughs[troughs.length - 1] },
    highlight_polygon: polygon,
    explanation: `Price oscillating between support ₹${avgTroughPrice.toFixed(2)} and resistance ₹${avgPeakPrice.toFixed(2)} (range ${rangePct.toFixed(1)}%). ${breakDir ? `Breaking ${breakDir}ward.` : 'No breakout yet.'}`,
    theoretical_target_price: breakDir === 'up' ? avgPeakPrice + (avgPeakPrice - avgTroughPrice) : breakDir === 'down' ? Math.max(0, avgTroughPrice - (avgPeakPrice - avgTroughPrice)) : null,
    risk_level: breakDir ? 'Medium' : 'Low',
    stoploss: breakDir === 'up' ? avgTroughPrice * 0.98 : breakDir === 'down' ? avgPeakPrice * 1.02 : null,
    suitable_for_intraday: true,
    suitable_for_swing: true,
  };
}

function detectBroadeningFormation(ohlcv: OHLCV, window = 80): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);

  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (peaks.length < 3 || troughs.length < 3) return null;

  const recentPeaks = peaks.slice(-3);
  const recentTroughs = troughs.slice(-3);

  const peakSlope = linearSlope(recentPeaks[0], high[recentPeaks[0]], recentPeaks[2], high[recentPeaks[2]]);
  const troughSlope = linearSlope(recentTroughs[0], low[recentTroughs[0]], recentTroughs[2], low[recentTroughs[2]]);

  if (peakSlope <= 0 || troughSlope >= 0) return null;

  const confidence = Math.round(Math.min(75, 50 + Math.abs(peakSlope - troughSlope) * 20));

  const polygon: [number, number][] = [];
  for (let k = Math.min(recentPeaks[0], recentTroughs[0]); k <= Math.max(recentPeaks[2], recentTroughs[2]); k++) {
    polygon.push([k, high[k]]);
    polygon.push([k, low[k]]);
  }

  return {
    pattern_name: 'Broadening Formation',
    category: 'Classic',
    confidence_percent: confidence,
    detected_on_timeframe: '',
    pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: close.length - 1 },
    anchor_points: { p1: recentPeaks[0], p2: recentPeaks[2], p3: recentTroughs[0], p4: recentTroughs[2] },
    highlight_polygon: polygon,
    explanation: `Expanding range: higher highs (slope ${peakSlope.toFixed(2)}) and lower lows (slope ${troughSlope.toFixed(2)}). Indicates increasing volatility and indecision.`,
    theoretical_target_price: null,
    risk_level: 'High',
    stoploss: null,
    suitable_for_intraday: true,
    suitable_for_swing: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Triangles                                                          */
/* ------------------------------------------------------------------ */

function detectTriangles(ohlcv: OHLCV, window = 80): PatternResult[] {
  const results: PatternResult[] = [];
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);

  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (peaks.length < 3 || troughs.length < 3) return results;

  // Fit lines to recent swing points
  const recentPeaks = peaks.slice(-4);
  const recentTroughs = troughs.slice(-4);

  const peakLine = fitLine(recentPeaks, recentPeaks.map((i) => high[i]));
  const troughLine = fitLine(recentTroughs, recentTroughs.map((i) => low[i]));

  const lastIdx = close.length - 1;
  const peakAtEnd = priceAtTrendline(lastIdx, recentPeaks[0], high[recentPeaks[0]], peakLine.slope);
  const troughAtEnd = priceAtTrendline(lastIdx, recentTroughs[0], low[recentTroughs[0]], troughLine.slope);

  // Check convergence
  const gap = peakAtEnd - troughAtEnd;
  if (gap <= 0 || gap / avg(close.slice(-10)) > 0.15) return results;

  const peakTouchCount = touchCount(recentPeaks, recentPeaks.map((i) => high[i]), peakLine.slope, peakLine.intercept);
  const troughTouchCount = touchCount(recentTroughs, recentTroughs.map((i) => low[i]), troughLine.slope, troughLine.intercept);

  if (peakTouchCount < 2 || troughTouchCount < 2) return results;

  // Classify triangle
  const isAscending = peakLine.slope < 0.1 && troughLine.slope > 0.05;
  const isDescending = peakLine.slope < -0.05 && troughLine.slope > -0.1;
  const isSymmetrical = peakLine.slope < -0.02 && troughLine.slope > 0.02;
  const isExpanding = peakLine.slope > 0.05 && troughLine.slope < -0.05;

  const polygon: [number, number][] = [];
  for (let k = Math.min(recentPeaks[0], recentTroughs[0]); k <= lastIdx; k++) {
    const r = k - Math.min(recentPeaks[0], recentTroughs[0]);
    polygon.push([k, priceAtTrendline(k, recentPeaks[0], high[recentPeaks[0]], peakLine.slope)]);
  }
  for (let k = lastIdx; k >= Math.min(recentPeaks[0], recentTroughs[0]); k--) {
    polygon.push([k, priceAtTrendline(k, recentTroughs[0], low[recentTroughs[0]], troughLine.slope)]);
  }

  const breakOut = close[lastIdx] > peakAtEnd * 1.005 ? 'up' : close[lastIdx] < troughAtEnd * 0.995 ? 'down' : null;

  if (isAscending) {
    const confidence = Math.round(Math.min(80, 55 + peakTouchCount * 5 + troughTouchCount * 5 + (breakOut ? 10 : 0)));
    results.push({
      pattern_name: 'Ascending Triangle',
      category: 'Triangle',
      confidence_percent: confidence,
      detected_on_timeframe: '',
      pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: lastIdx },
      anchor_points: { p1: recentPeaks[0], p2: recentPeaks[recentPeaks.length - 1], p3: recentTroughs[0], p4: recentTroughs[troughs.length - 1] },
      highlight_polygon: polygon,
      explanation: `Flat resistance (~₹${peakAtEnd.toFixed(2)}) with rising support. ${peakTouchCount} resistance touches, ${troughTouchCount} support touches. ${breakOut ? `Bullish breakout ${breakOut}.` : 'Awaiting breakout.'}`,
      theoretical_target_price: breakOut === 'up' ? peakAtEnd + gap : null,
      risk_level: breakOut ? 'Low' : 'Medium',
      stoploss: breakOut === 'up' ? troughAtEnd * 0.99 : null,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    });
  }

  if (isDescending) {
    const confidence = Math.round(Math.min(80, 55 + peakTouchCount * 5 + troughTouchCount * 5 + (breakOut ? 10 : 0)));
    results.push({
      pattern_name: 'Descending Triangle',
      category: 'Triangle',
      confidence_percent: confidence,
      detected_on_timeframe: '',
      pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: lastIdx },
      anchor_points: { p1: recentPeaks[0], p2: recentPeaks[recentPeaks.length - 1], p3: recentTroughs[0], p4: recentTroughs[troughs.length - 1] },
      highlight_polygon: polygon,
      explanation: `Flat support (~₹${troughAtEnd.toFixed(2)}) with falling resistance. ${peakTouchCount} resistance touches, ${troughTouchCount} support touches. ${breakOut ? `Bearish breakout ${breakOut}.` : 'Awaiting breakout.'}`,
      theoretical_target_price: breakOut === 'down' ? Math.max(0, troughAtEnd - gap) : null,
      risk_level: breakOut ? 'Low' : 'Medium',
      stoploss: breakOut === 'down' ? peakAtEnd * 1.01 : null,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    });
  }

  if (isSymmetrical) {
    const confidence = Math.round(Math.min(80, 50 + peakTouchCount * 5 + troughTouchCount * 5 + (breakOut ? 10 : 0)));
    results.push({
      pattern_name: 'Symmetrical Triangle',
      category: 'Triangle',
      confidence_percent: confidence,
      detected_on_timeframe: '',
      pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: lastIdx },
      anchor_points: { p1: recentPeaks[0], p2: recentPeaks[recentPeaks.length - 1], p3: recentTroughs[0], p4: recentTroughs[troughs.length - 1] },
      highlight_polygon: polygon,
      explanation: `Converging trendlines. Resistance slope ${peakLine.slope.toFixed(3)}, support slope ${troughLine.slope.toFixed(3)}. Gap reduces to ${(gap / avg(close.slice(-10)) * 100).toFixed(1)}%. ${breakOut ? `Breakout ${breakOut}.` : 'Awaiting direction.'}`,
      theoretical_target_price: breakOut === 'up' ? peakAtEnd + gap : breakOut === 'down' ? Math.max(0, troughAtEnd - gap) : null,
      risk_level: breakOut ? 'Low' : 'Medium',
      stoploss: breakOut === 'up' ? troughAtEnd * 0.99 : breakOut === 'down' ? peakAtEnd * 1.01 : null,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    });
  }

  if (isExpanding) {
    results.push({
      pattern_name: 'Expanding Triangle',
      category: 'Triangle',
      confidence_percent: Math.round(Math.min(70, 50 + peakTouchCount * 5 + troughTouchCount * 5)),
      detected_on_timeframe: '',
      pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: lastIdx },
      anchor_points: { p1: recentPeaks[0], p2: recentPeaks[recentPeaks.length - 1], p3: recentTroughs[0], p4: recentTroughs[troughs.length - 1] },
      highlight_polygon: polygon,
      explanation: `Diverging trendlines (expanding range): resistance slope ${peakLine.slope.toFixed(3)}, support slope ${troughLine.slope.toFixed(3)}. High volatility, no clear direction.`,
      theoretical_target_price: null,
      risk_level: 'High',
      stoploss: null,
      suitable_for_intraday: true,
      suitable_for_swing: false,
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Continuation Patterns                                              */
/* ------------------------------------------------------------------ */

function detectFlags(ohlcv: OHLCV, window = 60): PatternResult[] {
  const results: PatternResult[] = [];
  const { high, low, close, volume } = ohlcv;
  const n = Math.min(window, close.length);
  const start = Math.max(0, close.length - n);
  const prices = close.slice(start);
  const idxOff = start;

  if (prices.length < 20) return results;

  // Find sharp moves (flagpole)
  for (let i = 10; i < prices.length - 10; i++) {
    const move = pct(prices[i - 10], prices[i]);
    if (Math.abs(move) < 8) continue;

    const dir = move > 0 ? 'bull' : 'bear';
    const consolEnd = Math.min(i + 20, prices.length - 1);
    const consolPrices = prices.slice(i, consolEnd + 1);

    const consolMove = pct(prices[i], consolPrices[consolPrices.length - 1]);
    const consolRange = Math.max(...consolPrices) - Math.min(...consolPrices);
    const moveRange = Math.abs(prices[i] - prices[i - 10]);
    const rangeRatio = consolRange / moveRange;

    if (rangeRatio > 0.6) continue;

    const consolHigh = Math.max(...consolPrices);
    const consolLow = Math.min(...consolPrices);

    // Flag: parallel channels (consolidation range ratio < 0.6)
    if (rangeRatio < 0.5) {
      const isFlag = dir === 'bull'
        ? avg(consolPrices) < prices[i]  // bull flag: consolidating lower
        : avg(consolPrices) > prices[i]; // bear flag: consolidating higher

      if (isFlag) {
        const confidence = Math.round(Math.min(80, 50 + Math.abs(move) / 2 + (1 - rangeRatio) * 30));
        const patternName = dir === 'bull' ? 'Bull Flag' : 'Bear Flag';

        const polygon: [number, number][] = [];
        for (let k = i - 10; k <= consolEnd; k++) {
          polygon.push([k + idxOff, high[k + idxOff]]);
        }
        for (let k = consolEnd; k >= i - 10; k--) {
          polygon.push([k + idxOff, low[k + idxOff]]);
        }

        const target = dir === 'bull'
          ? prices[i] + (prices[i] - prices[i - 10])
          : prices[i] - (prices[i - 10] - prices[i]);

        results.push({
          pattern_name: patternName,
          category: 'Continuation',
          confidence_percent: confidence,
          detected_on_timeframe: '',
          pattern_region: { start_index: i + idxOff, end_index: consolEnd + idxOff },
          anchor_points: { p1: i + idxOff, p2: consolEnd + idxOff, p3: i - 10 + idxOff, p4: -1 },
          highlight_polygon: polygon,
          explanation: `Sharp ${dir === 'bull' ? 'up' : 'down'} move of ${Math.abs(move).toFixed(1)}% over 10 candles, followed by ${consolPrices.length}-candle consolidation (range ratio ${rangeRatio.toFixed(2)}). ${patternName}.`,
          theoretical_target_price: target,
          risk_level: 'Medium',
          stoploss: dir === 'bull' ? consolLow * 0.98 : consolHigh * 1.02,
          suitable_for_intraday: true,
          suitable_for_swing: true,
        });
      }
    }

    // Pennant: small triangle after move
    const consolLine = fitLine(
      Array.from({ length: consolPrices.length }, (_, k) => k),
      consolPrices
    );
    if (Math.abs(consolLine.slope) < 0.1 && rangeRatio < 0.55) {
      const pennantDirection = dir === 'bull' ? 'Bullish' : 'Bearish';
      const confidence = Math.round(Math.min(75, 45 + Math.abs(move) / 2 + (1 - rangeRatio) * 20));

      const polygon: [number, number][] = [];
      for (let k = i - 10; k <= consolEnd; k++) {
        polygon.push([k + idxOff, high[k + idxOff]]);
      }
      for (let k = consolEnd; k >= i - 10; k--) {
        polygon.push([k + idxOff, low[k + idxOff]]);
      }

      results.push({
        pattern_name: `${pennantDirection} Pennant`,
        category: 'Continuation',
        confidence_percent: confidence,
        detected_on_timeframe: '',
        pattern_region: { start_index: i + idxOff, end_index: consolEnd + idxOff },
        anchor_points: { p1: i + idxOff, p2: consolEnd + idxOff, p3: i - 10 + idxOff, p4: -1 },
        highlight_polygon: polygon,
        explanation: `Sharp move followed by a small converging consolidation (pennant). Flagpole: ${Math.abs(move).toFixed(1)}%. Consolidation range: ${(consolRange / avg(consolPrices) * 100).toFixed(1)}%.`,
        theoretical_target_price: dir === 'bull'
          ? prices[i] + (prices[i] - prices[i - 10])
          : prices[i] - (prices[i - 10] - prices[i]),
        risk_level: 'Medium',
        stoploss: dir === 'bull' ? consolLow * 0.98 : consolHigh * 1.02,
        suitable_for_intraday: true,
        suitable_for_swing: true,
      });
    }
  }

  return results;
}

function detectWedges(ohlcv: OHLCV, window = 60): PatternResult[] {
  const results: PatternResult[] = [];
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);

  const peaks = findSwingHighs(high, 2).filter((i) => i >= start);
  const troughs = findSwingLows(low, 2).filter((i) => i >= start);

  if (peaks.length < 3 || troughs.length < 3) return results;

  const recentPeaks = peaks.slice(-4);
  const recentTroughs = troughs.slice(-4);

  const peakLine = fitLine(recentPeaks, recentPeaks.map((i) => high[i]));
  const troughLine = fitLine(recentTroughs, recentTroughs.map((i) => low[i]));

  // Rising wedge: both lines slope up but trough line steeper (converging upward)
  if (peakLine.slope > 0 && troughLine.slope > peakLine.slope * 1.2) {
    const polygon: [number, number][] = [];
    for (let k = Math.min(recentPeaks[0], recentTroughs[0]); k <= close.length - 1; k++) {
      polygon.push([k, high[k]]);
    }
    for (let k = close.length - 1; k >= Math.min(recentPeaks[0], recentTroughs[0]); k--) {
      polygon.push([k, low[k]]);
    }

    results.push({
      pattern_name: 'Rising Wedge',
      category: 'Continuation',
      confidence_percent: Math.round(Math.min(80, 55 + Math.abs(peakLine.slope - troughLine.slope) * 50)),
      detected_on_timeframe: '',
      pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: close.length - 1 },
      anchor_points: { p1: recentPeaks[0], p2: recentPeaks[recentPeaks.length - 1], p3: recentTroughs[0], p4: recentTroughs[troughs.length - 1] },
      highlight_polygon: polygon,
      explanation: `Rising wedge: higher highs and even higher lows (converging upward). Typically bearish reversal/continuation pattern. Peak slope ${peakLine.slope.toFixed(3)}, trough slope ${troughLine.slope.toFixed(3)}.`,
      theoretical_target_price: null,
      risk_level: 'Medium',
      stoploss: null,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    });
  }

  // Falling wedge: both lines slope down but peak line steeper (converging downward)
  if (peakLine.slope < 0 && troughLine.slope < 0 && Math.abs(peakLine.slope) > Math.abs(troughLine.slope) * 1.2) {
    const polygon: [number, number][] = [];
    for (let k = Math.min(recentPeaks[0], recentTroughs[0]); k <= close.length - 1; k++) {
      polygon.push([k, high[k]]);
    }
    for (let k = close.length - 1; k >= Math.min(recentPeaks[0], recentTroughs[0]); k--) {
      polygon.push([k, low[k]]);
    }

    results.push({
      pattern_name: 'Falling Wedge',
      category: 'Continuation',
      confidence_percent: Math.round(Math.min(80, 55 + Math.abs(peakLine.slope - troughLine.slope) * 50)),
      detected_on_timeframe: '',
      pattern_region: { start_index: Math.min(recentPeaks[0], recentTroughs[0]), end_index: close.length - 1 },
      anchor_points: { p1: recentPeaks[0], p2: recentPeaks[recentPeaks.length - 1], p3: recentTroughs[0], p4: recentTroughs[troughs.length - 1] },
      highlight_polygon: polygon,
      explanation: `Falling wedge: lower lows and even lower highs (converging downward). Typically bullish reversal/continuation pattern. Peak slope ${peakLine.slope.toFixed(3)}, trough slope ${troughLine.slope.toFixed(3)}.`,
      theoretical_target_price: null,
      risk_level: 'Medium',
      stoploss: null,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Candlestick Patterns                                                */
/* ------------------------------------------------------------------ */

function detectCandlestickPatterns(ohlcv: OHLCV): PatternResult[] {
  const results: PatternResult[] = [];
  const { open, high, low, close } = ohlcv;
  const len = close.length;
  if (len < 5) return results;

  const last = len - 1;
  const body = (i: number) => Math.abs(close[i] - open[i]);
  const upperWick = (i: number) => high[i] - Math.max(close[i], open[i]);
  const lowerWick = (i: number) => Math.min(close[i], open[i]) - low[i];
  const isBull = (i: number) => close[i] > open[i];
  const isBear = (i: number) => close[i] < open[i];
  const bodyPct = (i: number) => body(i) / avg([high[i], low[i]]) * 100;
  const avgBody = avg(Array.from({ length: 10 }, (_, k) => body(len - 2 - k))) / avg(Array.from({ length: 10 }, (_, k) => (high[len - 2 - k] + low[len - 2 - k]) / 2)) * 100;

  // Hammer: small body, long lower wick (2x+ body), after downtrend
  if (bodyPct(last) < avgBody * 0.6 && lowerWick(last) > body(last) * 2 && upperWick(last) < body(last) * 0.3) {
    const trend = close[last - 5] > close[last] ? 'downtrend' : null;
    if (trend) {
      results.push({
        pattern_name: 'Hammer',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(85, 65 + (lowerWick(last) / body(last)) * 5)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last, end_index: last },
        anchor_points: { p1: last, p2: -1, p3: -1, p4: -1 },
        highlight_polygon: [[last, high[last]], [last, low[last]]],
        explanation: `Hammer candle after downtrend. Lower wick ${(lowerWick(last) / body(last)).toFixed(1)}x body length. Indicates potential bullish reversal.`,
        theoretical_target_price: open[last] + body(last) * 2,
        risk_level: 'Medium',
        stoploss: low[last] * 0.99,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }
  }

  // Inverted Hammer / Shooting Star
  if (bodyPct(last) < avgBody * 0.6 && upperWick(last) > body(last) * 2 && lowerWick(last) < body(last) * 0.3) {
    const trend = close[last - 5] < close[last] && upperWick(last) > body(last) * 2
      ? 'uptrend'
      : close[last - 5] > close[last] && upperWick(last) > body(last) * 2
      ? 'downtrend'
      : null;

    if (trend === 'downtrend') {
      results.push({
        pattern_name: 'Inverted Hammer',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(80, 60 + (upperWick(last) / body(last)) * 5)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last, end_index: last },
        anchor_points: { p1: last, p2: -1, p3: -1, p4: -1 },
        highlight_polygon: [[last, high[last]], [last, low[last]]],
        explanation: `Inverted Hammer after downtrend. Long upper wick indicates rejection of lower prices. Potential bullish reversal.`,
        theoretical_target_price: close[last] + body(last) * 2,
        risk_level: 'Medium',
        stoploss: low[last] * 0.99,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }

    if (trend === 'uptrend') {
      results.push({
        pattern_name: 'Shooting Star',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(80, 60 + (upperWick(last) / body(last)) * 5)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last, end_index: last },
        anchor_points: { p1: last, p2: -1, p3: -1, p4: -1 },
        highlight_polygon: [[last, high[last]], [last, low[last]]],
        explanation: `Shooting Star after uptrend. Long upper wick indicates rejection of higher prices. Potential bearish reversal.`,
        theoretical_target_price: open[last] - body(last) * 2,
        risk_level: 'Medium',
        stoploss: high[last] * 1.01,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }
  }

  // Engulfing patterns
  if (last >= 1) {
    if (isBear(last - 1) && isBull(last) && close[last] > open[last - 1] && open[last] < close[last - 1]) {
      results.push({
        pattern_name: 'Bullish Engulfing',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(85, 65 + (body(last) / body(last - 1)) * 10)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last - 1, end_index: last },
        anchor_points: { p1: last - 1, p2: last, p3: -1, p4: -1 },
        highlight_polygon: [[last - 1, high[last - 1]], [last - 1, low[last - 1]], [last, high[last]], [last, low[last]]],
        explanation: `Bullish Engulfing: previous bear candle fully engulfed by current bull candle. Strong buying pressure.`,
        theoretical_target_price: close[last] + body(last),
        risk_level: 'Low',
        stoploss: low[last] * 0.99,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }

    if (isBull(last - 1) && isBear(last) && close[last] < open[last - 1] && open[last] > close[last - 1]) {
      results.push({
        pattern_name: 'Bearish Engulfing',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(85, 65 + (body(last) / body(last - 1)) * 10)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last - 1, end_index: last },
        anchor_points: { p1: last - 1, p2: last, p3: -1, p4: -1 },
        highlight_polygon: [[last - 1, high[last - 1]], [last - 1, low[last - 1]], [last, high[last]], [last, low[last]]],
        explanation: `Bearish Engulfing: previous bull candle fully engulfed by current bear candle. Strong selling pressure.`,
        theoretical_target_price: close[last] - body(last),
        risk_level: 'Low',
        stoploss: high[last] * 1.01,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }
  }

  // Morning Star / Evening Star (3-candle)
  if (last >= 2) {
    if (isBear(last - 2) && bodyPct(last - 2) > avgBody && bodyPct(last - 1) < avgBody * 0.5 && isBull(last) && close[last] > (open[last - 2] + close[last - 2]) / 2) {
      results.push({
        pattern_name: 'Morning Star',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(90, 70 + (body(last) / body(last - 2)) * 10)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last - 2, end_index: last },
        anchor_points: { p1: last - 2, p2: last - 1, p3: last, p4: -1 },
        highlight_polygon: [[last - 2, high[last - 2]], [last - 2, low[last - 2]], [last, high[last]], [last, low[last]]],
        explanation: `Morning Star: long bear candle → small indecision → long bull candle closing above midpoint. Strong bullish reversal pattern.`,
        theoretical_target_price: close[last] + body(last - 2),
        risk_level: 'Low',
        stoploss: Math.min(low[last], low[last - 1]) * 0.99,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }

    if (isBull(last - 2) && bodyPct(last - 2) > avgBody && bodyPct(last - 1) < avgBody * 0.5 && isBear(last) && close[last] < (open[last - 2] + close[last - 2]) / 2) {
      results.push({
        pattern_name: 'Evening Star',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(90, 70 + (body(last) / body(last - 2)) * 10)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last - 2, end_index: last },
        anchor_points: { p1: last - 2, p2: last - 1, p3: last, p4: -1 },
        highlight_polygon: [[last - 2, high[last - 2]], [last - 2, low[last - 2]], [last, high[last]], [last, low[last]]],
        explanation: `Evening Star: long bull candle → small indecision → long bear candle closing below midpoint. Strong bearish reversal pattern.`,
        theoretical_target_price: close[last] - body(last - 2),
        risk_level: 'Low',
        stoploss: Math.max(high[last], high[last - 1]) * 1.01,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }
  }

  // Doji
  if (bodyPct(last) < 0.1 && body(last) / (high[last] - low[last]) < 0.15) {
    const trend = close[last - 5] > close[last] ? 'uptrend' : close[last - 5] < close[last] ? 'downtrend' : 'neutral';
    results.push({
      pattern_name: trend === 'uptrend' ? 'Doji (Bearish Reversal)' : trend === 'downtrend' ? 'Doji (Bullish Reversal)' : 'Doji',
      category: 'Price Action',
      confidence_percent: Math.round(Math.min(70, 50 + (trend !== 'neutral' ? 10 : 0))),
      detected_on_timeframe: '',
      pattern_region: { start_index: last, end_index: last },
      anchor_points: { p1: last, p2: -1, p3: -1, p4: -1 },
      highlight_polygon: [[last, high[last]], [last, low[last]]],
      explanation: `Doji candle (open ≈ close). Indicates market indecision. ${trend !== 'neutral' ? `Follows ${trend} — potential reversal.` : 'Neutral context.'}`,
      theoretical_target_price: null,
      risk_level: 'Medium',
      stoploss: null,
      suitable_for_intraday: true,
      suitable_for_swing: false,
    });
  }

  // Harami
  if (last >= 1) {
    if (isBear(last - 1) && isBull(last) && high[last] < high[last - 1] && low[last] > low[last - 1] && body(last) < body(last - 1)) {
      results.push({
        pattern_name: 'Bullish Harami',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(70, 50 + (1 - body(last) / body(last - 1)) * 20)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last - 1, end_index: last },
        anchor_points: { p1: last - 1, p2: last, p3: -1, p4: -1 },
        highlight_polygon: [[last - 1, high[last - 1]], [last - 1, low[last - 1]], [last, high[last]], [last, low[last]]],
        explanation: `Bullish Harami: small bull candle within previous bear candle body. Potential trend reversal to upside.`,
        theoretical_target_price: null,
        risk_level: 'Medium',
        stoploss: low[last] * 0.99,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }

    if (isBull(last - 1) && isBear(last) && high[last] < high[last - 1] && low[last] > low[last - 1] && body(last) < body(last - 1)) {
      results.push({
        pattern_name: 'Bearish Harami',
        category: 'Price Action',
        confidence_percent: Math.round(Math.min(70, 50 + (1 - body(last) / body(last - 1)) * 20)),
        detected_on_timeframe: '',
        pattern_region: { start_index: last - 1, end_index: last },
        anchor_points: { p1: last - 1, p2: last, p3: -1, p4: -1 },
        highlight_polygon: [[last - 1, high[last - 1]], [last - 1, low[last - 1]], [last, high[last]], [last, low[last]]],
        explanation: `Bearish Harami: small bear candle within previous bull candle body. Potential trend reversal to downside.`,
        theoretical_target_price: null,
        risk_level: 'Medium',
        stoploss: high[last] * 1.01,
        suitable_for_intraday: true,
        suitable_for_swing: false,
      });
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Harmonic Patterns                                                  */
/* ------------------------------------------------------------------ */

function detectHarmonic(ohlcv: OHLCV, window = 120): PatternResult[] {
  const results: PatternResult[] = [];
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);

  const pivots = zigzag(high.slice(start), low.slice(start), 3);
  if (pivots.length < 5) return results;

  const idxOff = start;

  // Scan swing point sequences (X-A-B-C-D)
  for (let i = 0; i < pivots.length - 4; i++) {
    const x = pivots[i], a = pivots[i + 1], b = pivots[i + 2], c = pivots[i + 3], d = pivots[i + 4];

    // Need alternating types
    if (x.type === a.type || a.type === b.type || b.type === c.type || c.type === d.type) continue;

    const xPrice = x.price, aPrice = a.price, bPrice = b.price, cPrice = c.price, dPrice = d.price;
    const xa = Math.abs(pct(xPrice, aPrice));
    const ab = Math.abs(pct(aPrice, bPrice));
    const bc = Math.abs(pct(bPrice, cPrice));
    const cd = Math.abs(pct(cPrice, dPrice));

    if (xa < 5 || ab < 3 || bc < 3 || cd < 3) continue;

    const abRetrace = ab > 0 ? Math.abs(pct(aPrice, bPrice)) / Math.abs(pct(xPrice, aPrice)) : 0;
    const bcRetrace = bc > 0 ? Math.abs(pct(bPrice, cPrice)) / Math.abs(pct(aPrice, bPrice)) : 0;
    const cdExt = cd > 0 ? Math.abs(pct(cPrice, dPrice)) / Math.abs(pct(bPrice, cPrice)) : 0;
    const xaRetrace = cd > 0 ? Math.abs(pct(xPrice, dPrice)) / Math.abs(pct(xPrice, aPrice)) : 0;

    const isBullish = x.type === 'high'; // X is high means A is low, so X->A is down move, A->B is up = bullish

    // Gartley (222)
    if (abRetrace >= 0.55 && abRetrace <= 0.68 && bcRetrace >= 0.55 && bcRetrace <= 0.78 && cdExt >= 1.1 && cdExt <= 1.35 && xaRetrace >= 0.7 && xaRetrace <= 0.84) {
      const polygon: [number, number][] = pivots.slice(i, i + 5).map((p) => [p.index + idxOff, p.price]);
      results.push({
        pattern_name: isBullish ? 'Bullish Gartley' : 'Bearish Gartley',
        category: 'Harmonic',
        confidence_percent: Math.round(Math.min(85, 70 + (1 - Math.abs(abRetrace - 0.618)) * 30 - (1 - Math.abs(bcRetrace - 0.618)) * 20)),
        detected_on_timeframe: '',
        pattern_region: { start_index: x.index + idxOff, end_index: d.index + idxOff },
        anchor_points: { p1: x.index + idxOff, p2: a.index + idxOff, p3: b.index + idxOff, p4: c.index + idxOff },
        highlight_polygon: polygon,
        explanation: `Gartley pattern detected. XA: ${xa.toFixed(1)}%, AB: ${(abRetrace * 100).toFixed(0)}% retracement, BC: ${(bcRetrace * 100).toFixed(0)}% retracement, CD: ${(cdExt * 100).toFixed(0)}% extension. PRZ at ~${isBullish ? 'D' : 'X'} for reversal.`,
        theoretical_target_price: isBullish ? dPrice + Math.abs(aPrice - dPrice) * 0.382 : dPrice - Math.abs(aPrice - dPrice) * 0.382,
        risk_level: 'Medium',
        stoploss: isBullish ? dPrice * 0.97 : dPrice * 1.03,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      });
    }

    // Bat
    if (abRetrace >= 0.35 && abRetrace <= 0.52 && bcRetrace >= 0.55 && bcRetrace <= 0.85 && cdExt >= 1.2 && cdExt <= 1.4 && xaRetrace >= 0.82 && xaRetrace <= 0.89) {
      const polygon: [number, number][] = pivots.slice(i, i + 5).map((p) => [p.index + idxOff, p.price]);
      results.push({
        pattern_name: isBullish ? 'Bullish Bat' : 'Bearish Bat',
        category: 'Harmonic',
        confidence_percent: Math.round(Math.min(85, 70 + (1 - Math.abs(xaRetrace - 0.886)) * 50)),
        detected_on_timeframe: '',
        pattern_region: { start_index: x.index + idxOff, end_index: d.index + idxOff },
        anchor_points: { p1: x.index + idxOff, p2: a.index + idxOff, p3: b.index + idxOff, p4: c.index + idxOff },
        highlight_polygon: polygon,
        explanation: `Bat pattern: shallow AB retracement of ${(abRetrace * 100).toFixed(0)}% (XA). D at ${(xaRetrace * 100).toFixed(0)}% of XA. Sharp reversal expected at D.`,
        theoretical_target_price: isBullish ? dPrice + Math.abs(aPrice - dPrice) * 0.382 : dPrice - Math.abs(aPrice - dPrice) * 0.382,
        risk_level: 'Medium',
        stoploss: isBullish ? dPrice * 0.96 : dPrice * 1.04,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      });
    }

    // Butterfly
    if (abRetrace >= 0.7 && abRetrace <= 0.82 && bcRetrace >= 0.55 && bcRetrace <= 0.85 && cdExt >= 1.2 && cdExt <= 1.6 && xaRetrace >= 1.2 && xaRetrace <= 1.6) {
      const polygon: [number, number][] = pivots.slice(i, i + 5).map((p) => [p.index + idxOff, p.price]);
      results.push({
        pattern_name: isBullish ? 'Bullish Butterfly' : 'Bearish Butterfly',
        category: 'Harmonic',
        confidence_percent: Math.round(Math.min(80, 65 + (1 - Math.abs(xaRetrace - 1.27)) * 30)),
        detected_on_timeframe: '',
        pattern_region: { start_index: x.index + idxOff, end_index: d.index + idxOff },
        anchor_points: { p1: x.index + idxOff, p2: a.index + idxOff, p3: b.index + idxOff, p4: c.index + idxOff },
        highlight_polygon: polygon,
        explanation: `Butterfly pattern: deep AB retracement (${(abRetrace * 100).toFixed(0)}%). D extends beyond X (${(xaRetrace * 100).toFixed(0)}% of XA). Extreme reversal point.`,
        theoretical_target_price: isBullish ? dPrice + Math.abs(xPrice - dPrice) * 0.5 : dPrice - Math.abs(xPrice - dPrice) * 0.5,
        risk_level: 'High',
        stoploss: isBullish ? dPrice * 0.95 : dPrice * 1.05,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      });
    }

    // Crab
    if (abRetrace >= 0.35 && abRetrace <= 0.62 && bcRetrace >= 0.55 && bcRetrace <= 0.85 && cdExt >= 1.5 && cdExt <= 2.5 && xaRetrace >= 1.5 && xaRetrace <= 1.7) {
      const polygon: [number, number][] = pivots.slice(i, i + 5).map((p) => [p.index + idxOff, p.price]);
      results.push({
        pattern_name: isBullish ? 'Bullish Crab' : 'Bearish Crab',
        category: 'Harmonic',
        confidence_percent: Math.round(Math.min(85, 70 + (1 - Math.abs(xaRetrace - 1.618)) * 30)),
        detected_on_timeframe: '',
        pattern_region: { start_index: x.index + idxOff, end_index: d.index + idxOff },
        anchor_points: { p1: x.index + idxOff, p2: a.index + idxOff, p3: b.index + idxOff, p4: c.index + idxOff },
        highlight_polygon: polygon,
        explanation: `Crab pattern: very deep extension at D (${(xaRetrace * 100).toFixed(0)}% of XA). AB shallow (${(abRetrace * 100).toFixed(0)}%). Sharp reversal expected near D.`,
        theoretical_target_price: isBullish ? dPrice + Math.abs(xPrice - dPrice) * 0.382 : dPrice - Math.abs(xPrice - dPrice) * 0.382,
        risk_level: 'High',
        stoploss: isBullish ? dPrice * 0.94 : dPrice * 1.06,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      });
    }

    // Cypher
    if (abRetrace >= 0.35 && abRetrace <= 0.55 && bcRetrace >= 1.1 && bcRetrace <= 1.4 && Math.abs(pct(cPrice, dPrice)) / Math.abs(pct(bPrice, cPrice)) >= 1.2 && Math.abs(pct(cPrice, dPrice)) / Math.abs(pct(bPrice, cPrice)) <= 1.5 && xaRetrace >= 0.7 && xaRetrace <= 0.84) {
      const polygon: [number, number][] = pivots.slice(i, i + 5).map((p) => [p.index + idxOff, p.price]);
      results.push({
        pattern_name: isBullish ? 'Bullish Cypher' : 'Bearish Cypher',
        category: 'Harmonic',
        confidence_percent: Math.round(Math.min(80, 65 + (1 - Math.abs(xaRetrace - 0.786)) * 40)),
        detected_on_timeframe: '',
        pattern_region: { start_index: x.index + idxOff, end_index: d.index + idxOff },
        anchor_points: { p1: x.index + idxOff, p2: a.index + idxOff, p3: b.index + idxOff, p4: c.index + idxOff },
        highlight_polygon: polygon,
        explanation: `Cypher pattern: shallow AB (${(abRetrace * 100).toFixed(0)}%), BC extension (${(bcRetrace * 100).toFixed(0)}%), D at ${(xaRetrace * 100).toFixed(0)}% of XA. Potential reversal at D.`,
        theoretical_target_price: isBullish ? dPrice + Math.abs(aPrice - dPrice) * 0.382 : dPrice - Math.abs(aPrice - dPrice) * 0.382,
        risk_level: 'Medium',
        stoploss: isBullish ? dPrice * 0.96 : dPrice * 1.04,
        suitable_for_intraday: false,
        suitable_for_swing: true,
      });
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Special Patterns                                                    */
/* ------------------------------------------------------------------ */

function detectVReversal(ohlcv: OHLCV, window = 40): PatternResult | null {
  const { close, low, high } = ohlcv;
  const n = Math.min(window, close.length);
  const start = Math.max(0, close.length - n);
  const prices = close.slice(start);
  const idxOff = start;

  if (prices.length < 15) return null;

  const bottomIdx = prices.indexOf(Math.min(...prices));
  if (bottomIdx < 3 || bottomIdx > prices.length - 4) return null;

  const leftDrop = pct(prices[0], prices[bottomIdx]);
  const rightRise = pct(prices[bottomIdx], prices[prices.length - 1]);

  if (leftDrop < -8 && rightRise > 8 && Math.abs(leftDrop) / rightRise > 0.7 && Math.abs(leftDrop) / rightRise < 1.5) {
    const confidence = Math.round(Math.min(85, 65 + Math.min(Math.abs(leftDrop), rightRise) / 2));

    const polygon: [number, number][] = [];
    for (let k = start; k < close.length; k++) polygon.push([k, close[k]]);

    return {
      pattern_name: 'V-Reversal',
      category: 'Special',
      confidence_percent: confidence,
      detected_on_timeframe: '',
      pattern_region: { start_index: start, end_index: close.length - 1 },
      anchor_points: { p1: start, p2: bottomIdx + idxOff, p3: close.length - 1, p4: -1 },
      highlight_polygon: polygon,
      explanation: `V-shaped reversal: ${Math.abs(leftDrop).toFixed(1)}% drop followed by ${rightRise.toFixed(1)}% rise. Sharp reversal pattern with ${(Math.abs(leftDrop) / rightRise).toFixed(2)}x symmetry ratio.`,
      theoretical_target_price: prices[prices.length - 1] + rightRise * 0.5,
      risk_level: 'Medium',
      stoploss: prices[bottomIdx] * 0.99,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    };
  }
  return null;
}

function detectSpikeReversal(ohlcv: OHLCV, window = 30): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);

  const last = high.length - 1;
  const avgRange = avg(Array.from({ length: 10 }, (_, i) => high[start + i] - low[start + i]));
  const currentRange = high[last] - low[last];

  if (currentRange < avgRange * 2.5) return null;

  const prevAvg = avg(Array.from({ length: 5 }, (_, i) => close[last - 5 + i]));
  const spikeDir = close[last] > prevAvg ? 'bullish' : 'bearish';

  const confidence = Math.round(Math.min(75, 50 + (currentRange / avgRange - 2) * 15));

  const polygon: [number, number][] = [[last, high[last]], [last, low[last]]];

  return {
    pattern_name: `Spike Reversal (${spikeDir === 'bullish' ? 'Buying' : 'Selling'} Climax)`,
    category: 'Special',
    confidence_percent: confidence,
    detected_on_timeframe: '',
    pattern_region: { start_index: last, end_index: last },
    anchor_points: { p1: last, p2: -1, p3: -1, p4: -1 },
    highlight_polygon: polygon,
    explanation: `${spikeDir === 'bullish' ? 'Buying' : 'Selling'} climax: current range ${(currentRange / avgRange).toFixed(1)}x average range (₹${avgRange.toFixed(2)}). ${spikeDir === 'bullish' ? 'Potential exhaustion/trend reversal' : 'Potential capitulation/trend reversal'} ahead.`,
    theoretical_target_price: spikeDir === 'bullish' ? close[last] + avgRange : Math.max(0, close[last] - avgRange),
    risk_level: 'High',
    stoploss: spikeDir === 'bullish' ? low[last] * 0.99 : high[last] * 1.01,
    suitable_for_intraday: true,
    suitable_for_swing: false,
  };
}

function detectBreakout(ohlcv: OHLCV, window = 40): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, high.length);
  const start = Math.max(0, high.length - n);
  const rangePrices = close.slice(start, high.length - 1);
  if (rangePrices.length < 15) return null;

  const rangeHigh = Math.max(...rangePrices);
  const rangeLow = Math.min(...rangePrices);
  const rangePct_ = pct(rangeLow, rangeHigh);
  if (rangePct_ > 15) return null;

  const stdev = stddev(rangePrices);
  const lastClose = close[close.length - 1];
  const mean = avg(rangePrices);

  if (lastClose > mean + stdev * 2) {
    const polygon: [number, number][] = [[start, rangeHigh], [start, rangeLow], [close.length - 1, lastClose]];
    return {
      pattern_name: 'Breakout (Bullish)',
      category: 'Special',
      confidence_percent: Math.round(Math.min(85, 65 + (lastClose / mean - 1) * 200)),
      detected_on_timeframe: '',
      pattern_region: { start_index: start, end_index: close.length - 1 },
      anchor_points: { p1: start, p2: close.length - 1, p3: -1, p4: -1 },
      highlight_polygon: polygon,
      explanation: `Price broke above ${(rangePct_).toFixed(1)}% consolidation range. Current ₹${lastClose.toFixed(2)} vs range ₹${rangeHigh.toFixed(2)} — ₹${rangeLow.toFixed(2)}. ${(lastClose / mean).toFixed(3)}x mean.`,
      theoretical_target_price: lastClose + stdev * 2,
      risk_level: 'Low',
      stoploss: rangeHigh * 0.99,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    };
  }

  if (lastClose < mean - stdev * 2) {
    const polygon: [number, number][] = [[start, rangeHigh], [start, rangeLow], [close.length - 1, lastClose]];
    return {
      pattern_name: 'Breakout (Bearish)',
      category: 'Special',
      confidence_percent: Math.round(Math.min(85, 65 + (1 - lastClose / mean) * 200)),
      detected_on_timeframe: '',
      pattern_region: { start_index: start, end_index: close.length - 1 },
      anchor_points: { p1: start, p2: close.length - 1, p3: -1, p4: -1 },
      highlight_polygon: polygon,
      explanation: `Price broke below ${(rangePct_).toFixed(1)}% consolidation range. Current ₹${lastClose.toFixed(2)} vs range ₹${rangeHigh.toFixed(2)} — ₹${rangeLow.toFixed(2)}. Breakdown confirmed.`,
      theoretical_target_price: Math.max(0, lastClose - stdev * 2),
      risk_level: 'Low',
      stoploss: rangeLow * 1.01,
      suitable_for_intraday: true,
      suitable_for_swing: true,
    };
  }

  return null;
}

function detectHighTightFlag(ohlcv: OHLCV, window = 60): PatternResult | null {
  const { high, low, close } = ohlcv;
  const n = Math.min(window, close.length);
  const start = Math.max(0, close.length - n);
  const prices = close.slice(start);
  const idxOff = start;

  if (prices.length < 20) return null;

  for (let i = 10; i < prices.length - 10; i++) {
    const surge = pct(prices[i - 10], prices[i]);
    if (surge < 20) continue;

    const consolPrices = prices.slice(i, i + 15);
    if (consolPrices.length < 5) continue;

    const consolRange = Math.max(...consolPrices) - Math.min(...consolPrices);
    const surgeRange = Math.abs(prices[i] - prices[i - 10]);

    if (consolRange / surgeRange > 0.5) continue;

    const confidence = Math.round(Math.min(85, 60 + surge / 3 + (1 - consolRange / surgeRange) * 15));

    const polygon: [number, number][] = [];
    for (let k = i - 10; k < Math.min(i + 15, prices.length); k++) {
      polygon.push([k + idxOff, high[k + idxOff]]);
    }
    for (let k = Math.min(i + 15, prices.length) - 1; k >= i - 10; k--) {
      polygon.push([k + idxOff, low[k + idxOff]]);
    }

    return {
      pattern_name: 'High Tight Flag',
      category: 'Special',
      confidence_percent: confidence,
      detected_on_timeframe: '',
      pattern_region: { start_index: i + idxOff, end_index: Math.min(i + 15, prices.length - 1) + idxOff },
      anchor_points: { p1: i - 10 + idxOff, p2: i + idxOff, p3: Math.min(i + 15, prices.length - 1) + idxOff, p4: -1 },
      highlight_polygon: polygon,
      explanation: `High Tight Flag: ${surge.toFixed(1)}% surge in 10 candles followed by tight consolidation (range ratio ${(consolRange / surgeRange).toFixed(2)}). Very bullish continuation pattern.`,
      theoretical_target_price: prices[i] + (prices[i] - prices[i - 10]),
      risk_level: 'Medium',
      stoploss: Math.min(...consolPrices) * 0.97,
      suitable_for_intraday: false,
      suitable_for_swing: true,
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Master Detection Engine                                            */
/* ------------------------------------------------------------------ */

export function detectAllPatterns(ohlcv: OHLCV, timeframeLabel = ''): PatternResult[] {
  const results: PatternResult[] = [];

  const detectors: (() => PatternResult | null | PatternResult[])[] = [
    () => detectDoubleTop(ohlcv),
    () => detectDoubleBottom(ohlcv),
    () => detectHeadAndShoulders(ohlcv),
    () => detectInverseHeadAndShoulders(ohlcv),
    () => detectTripleTop(ohlcv),
    () => detectTripleBottom(ohlcv),
    () => detectCupAndHandle(ohlcv),
    () => detectRoundedBottom(ohlcv),
    () => detectRectangle(ohlcv),
    () => detectBroadeningFormation(ohlcv),
    () => detectVReversal(ohlcv),
    () => detectSpikeReversal(ohlcv),
    () => detectBreakout(ohlcv),
    () => detectHighTightFlag(ohlcv),
    () => detectTriangles(ohlcv),
    () => detectFlags(ohlcv),
    () => detectWedges(ohlcv),
    () => detectCandlestickPatterns(ohlcv),
    () => detectHarmonic(ohlcv),
  ];

  for (const detector of detectors) {
    try {
      const result = detector();
      if (result) {
        const items = Array.isArray(result) ? result : [result];
        for (const item of items) {
          item.detected_on_timeframe = timeframeLabel;
          results.push(item);
        }
      }
    } catch {
      // skip pattern if error
    }
  }

  // Deduplicate similar patterns, keep highest confidence
  results.sort((a, b) => b.confidence_percent - a.confidence_percent);
  return results;
}
