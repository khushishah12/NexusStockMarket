export interface OverlayPattern {
  pattern_name: string;
  pattern_region: { start_index: number; end_index: number };
  anchor_points: { p1: number; p2: number; p3: number; p4: number };
}

const PATTERN_COLORS = [
  { band: 'rgba(244,114,182,0.07)', line: '#f472b6', point: '#f472b6', glow: 'rgba(244,114,182,0.25)' },
  { band: 'rgba(251,191,36,0.07)', line: '#fbbf24', point: '#fbbf24', glow: 'rgba(251,191,36,0.25)' },
  { band: 'rgba(167,139,250,0.07)', line: '#a78bfa', point: '#a78bfa', glow: 'rgba(167,139,250,0.25)' },
];

const TIMEFRAME_COLORS: Record<string, string> = {
  '1D': '#22d3ee', '5D': '#34d399', '1M': '#fbbf24',
  '6M': '#f472b6', '1Y': '#a78bfa', '5Y': '#fb923c', 'MAX': '#4ade80',
};

export function buildOverlayChartUrl(
  symbol: string,
  timeframe: string,
  timestamps: string[],
  closePrices: number[],
  patterns: OverlayPattern[],
): string | null {
  if (closePrices.length < 5) return null;

  const maxPoints = 120;
  const slicedLabels = timestamps.slice(-maxPoints);
  const prices = closePrices.slice(-maxPoints);
  const offset = closePrices.length - prices.length;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice;
  const bandTop = maxPrice + priceRange * 0.15;
  const bandBottom = Math.max(0, minPrice - priceRange * 0.15);

  const datasets: any[] = [];

  const topPatterns = patterns
    .filter((p) => {
      const si = p.pattern_region.start_index;
      const ei = p.pattern_region.end_index;
      return ei >= offset && si < offset + prices.length;
    })
    .slice(0, 3);

  /* ---- 1. Background bands (bar type, drawn behind everything) ---- */
  topPatterns.forEach((p, idx) => {
    const color = PATTERN_COLORS[idx];
    const si = Math.max(0, p.pattern_region.start_index - offset);
    const ei = Math.min(prices.length - 1, p.pattern_region.end_index - offset);
    if (si >= prices.length || ei < 0) return;

    const bandData: (number | null)[] = prices.map(() => null);
    for (let i = si; i <= ei; i++) bandData[i] = bandTop;

    datasets.push({
      type: 'bar',
      data: bandData,
      backgroundColor: color.band,
      borderWidth: 0,
      borderSkipped: false,
      barPercentage: 1.0,
      categoryPercentage: 1.0,
    });
  });

  /* ---- 2. Main price line ---- */
  datasets.push({
    label: symbol,
    data: prices,
    borderColor: TIMEFRAME_COLORS[timeframe] ?? '#22d3ee',
    backgroundColor: TIMEFRAME_COLORS[timeframe] ?? '#22d3ee',
    fill: false,
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.15,
  });

  /* ---- 3. Pattern overlays ---- */
  topPatterns.forEach((p, idx) => {
    const color = PATTERN_COLORS[idx];
    const si = Math.max(0, p.pattern_region.start_index - offset);
    const ei = Math.min(prices.length - 1, p.pattern_region.end_index - offset);
    if (si >= prices.length || ei < 0) return;

    /* Highlighted price segment — thick white line in pattern region */
    const segData: (number | null)[] = prices.map(() => null);
    for (let i = si; i <= ei; i++) segData[i] = prices[i];

    datasets.push({
      data: segData,
      borderColor: '#ffffff',
      borderWidth: 3,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
      spanGaps: false,
    });

    /* Glow behind the highlight */
    const glowData: (number | null)[] = prices.map(() => null);
    for (let i = si; i <= ei; i++) glowData[i] = prices[i];

    datasets.push({
      data: glowData,
      borderColor: color.glow,
      borderWidth: 6,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
      spanGaps: false,
    });

    /* Boundary markers at region start & end */
    const boundaries: { x: number; y: number }[] = [];
    if (si >= 0 && si < prices.length) boundaries.push({ x: si, y: prices[si] });
    if (ei >= 0 && ei < prices.length && ei !== si) boundaries.push({ x: ei, y: prices[ei] });

    if (boundaries.length > 0) {
      datasets.push({
        data: boundaries,
        type: 'scatter',
        backgroundColor: color.point,
        borderColor: '#ffffff',
        borderWidth: 2,
        pointRadius: 6,
        pointStyle: 'rectRot',
      });
    }

    /* Anchor points */
    const anchorKeys = ['p1', 'p2', 'p3', 'p4'] as const;
    const anchors: { x: number; y: number }[] = [];
    for (const key of anchorKeys) {
      const ai = p.anchor_points[key];
      if (ai >= 0 && ai >= offset && ai < offset + prices.length) {
        anchors.push({ x: ai - offset, y: closePrices[ai] });
      }
    }

    /* Trendline connecting anchors */
    if (anchors.length > 1) {
      datasets.push({
        label: p.pattern_name,
        data: anchors,
        type: 'line',
        borderColor: color.line,
        borderWidth: 2.5,
        borderDash: [7, 4],
        pointRadius: 0,
        fill: false,
        showLine: true,
      });
    }

    /* Anchor point markers */
    if (anchors.length > 0) {
      datasets.push({
        data: anchors,
        type: 'scatter',
        backgroundColor: color.point,
        borderColor: '#ffffff',
        borderWidth: 2.5,
        pointRadius: 7,
        pointStyle: 'circle',
      });
    }
  });

  const config = {
    type: 'line',
    data: { labels: slicedLabels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'start',
          labels: {
            color: '#94a3b8',
            font: { size: 10 },
            boxWidth: 14,
            padding: 8,
            filter: (item: any, data: any) => {
              const ds = data.datasets[item.datasetIndex];
              return ds.label && ds.label.length > 0;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 12 },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
      backgroundColor: '#0f172a',
    },
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=900&h=420`;
}
