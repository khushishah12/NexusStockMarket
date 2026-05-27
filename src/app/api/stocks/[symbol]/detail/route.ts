import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

const QUOTESUMMARY_MODULES = [
  'price', 'summaryDetail', 'summaryProfile', 'financialData',
  'defaultKeyStatistics', 'calendarEvents', 'earnings', 'earningsHistory',
  'earningsTrend', 'recommendationTrend', 'incomeStatementHistory',
  'balanceSheetHistory', 'cashflowStatementHistory', 'secFilings',
] as const;

function timeframeToDays(tf: Timeframe): number {
  switch (tf) {
    case '1D': return 1;
    case '5D': return 5;
    case '1M': return 30;
    case '6M': return 180;
    case '1Y': return 365;
    case '5Y': return 1825;
    case 'MAX': return 7300;
  }
}

function timeframeToInterval(tf: Timeframe): '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' {
  if (tf === '1D') return '5m';
  if (tf === '5D') return '15m';
  if (tf === '1M') return '1h';
  if (tf === '6M' || tf === '1Y') return '1d';
  return '1wk';
}

function buildChartUrl(symbol: string, tf: string, labels: string[], data: (number | null)[]): string {
  const slice = (arr: any[]) => arr.slice(-100);
  const colors: Record<string, string> = {
    '1D': '#22d3ee', '5D': '#34d399', '1M': '#fbbf24',
    '6M': '#f472b6', '1Y': '#a78bfa', '5Y': '#fb923c', 'MAX': '#4ade80',
  };
  const config = {
    type: 'line', data: {
      labels: slice(labels), datasets: [{
        label: `${symbol} (${tf})`, data: slice(data),
        borderColor: colors[tf] ?? '#22d3ee', backgroundColor: colors[tf] ?? '#22d3ee',
        fill: false, borderWidth: 2, pointRadius: 0, tension: 0.1,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      backgroundColor: '#0f172a',
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
}

function buildEpsChartUrl(symbol: string, quarters: string[], actual: (number | null)[]): string | null {
  if (quarters.length === 0) return null;
  const sliceQ = quarters.slice(-12);
  const sliceA = actual.slice(-12);
  const config = {
    type: 'bar', data: {
      labels: sliceQ, datasets: [{
        label: 'EPS (Actual)', data: sliceA,
        backgroundColor: '#22d3ee', borderColor: '#22d3ee', borderRadius: 4, borderWidth: 1,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      backgroundColor: '#0f172a',
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
}

function buildRevenueChartUrl(
  symbol: string, quarters: string[], revenue: (number | null)[], netIncome: (number | null)[]
): string | null {
  if (quarters.length === 0) return null;
  const sliceQ = quarters.slice(-12);
  const sliceR = revenue.slice(-12);
  const sliceN = netIncome.slice(-12);
  const formatVal = (v: number | null) => v != null ? v / 1e7 : null;
  const config = {
    type: 'bar', data: {
      labels: sliceQ, datasets: [
        { label: 'Revenue (Cr)', data: sliceR.map(formatVal), backgroundColor: '#22d3ee', borderRadius: 4 },
        { label: 'Net Income (Cr)', data: sliceN.map(formatVal), backgroundColor: '#34d399', borderRadius: 4 },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 9 } } } },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      backgroundColor: '#0f172a',
    },
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
}

function safeGet(obj: any, path: string, fallback: any = null) {
  try {
    return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? fallback;
  } catch {
    return fallback;
  }
}

function extractNewsFromSearch(searchResult: any) {
  const news = safeGet(searchResult, 'news', []);
  return Array.isArray(news) ? news.slice(0, 10).map((n: any) => ({
    title: n.title || 'Untitled',
    source: n.publisher || 'Unknown',
    link: n.link || '#',
    time: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
    summary: n.summary || null,
    type: n.type || 'STORY',
  })) : [];
}

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
  }

  try {
    const [quoteResult, qsRaw, insightsRaw, searchRaw, ...chartRaw] = await Promise.allSettled([
      yahooFinance.quote(symbol).catch(() => null),
      yahooFinance.quoteSummary(symbol, { modules: [...QUOTESUMMARY_MODULES] }).catch(() => null),
      yahooFinance.insights(symbol).catch(() => null),
      yahooFinance.search(symbol, { newsCount: 10, quotesCount: 0 }).catch(() => null),
      ...TIMEFRAMES.map((tf) =>
        yahooFinance.chart(symbol, {
          period1: Math.floor(Date.now() / 1000) - timeframeToDays(tf) * 86400,
          interval: timeframeToInterval(tf),
          return: 'object',
        }).catch(() => null)
      ),
    ]);

    const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
    const qs = qsRaw.status === 'fulfilled' ? qsRaw.value : null;
    const insights = insightsRaw.status === 'fulfilled' ? insightsRaw.value : null;
    const searchNews = searchRaw.status === 'fulfilled' ? searchRaw.value : null;
    const chartDataArr = chartRaw.map((r) => (r.status === 'fulfilled' ? r.value : null));

    const qsResult = safeGet(qs, 'quoteSummary.result[0]', {});

    // --- Price & Change ---
    const price = quote?.regularMarketPrice ?? safeGet(qsResult, 'price.regularMarketPrice.raw');
    const prevClose = quote?.regularMarketPreviousClose ?? safeGet(qsResult, 'summaryDetail.previousClose.raw');
    const changePercent = price != null && prevClose != null && prevClose > 0
      ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
      : null;
    const change = price != null && prevClose != null
      ? parseFloat((price - prevClose).toFixed(2))
      : null;

    // --- Market Status ---
    const marketState = safeGet(qsResult, 'price.marketState', 'REGULAR');
    const marketStatus = marketState === 'PRE' ? 'PRE-MARKET'
      : marketState === 'POST' ? 'POST-MARKET'
      : marketState === 'REGULAR' ? 'OPEN'
      : 'CLOSED';

    // --- Section 2: Charts ---
    const charts: { timeframe: string; chartUrl: string | null }[] = [];
    for (let i = 0; i < TIMEFRAMES.length; i++) {
      const tf = TIMEFRAMES[i];
      const cd = chartDataArr[i];
      if (cd?.timestamp && cd?.indicators?.quote?.[0]?.close) {
        const timestamps = cd.timestamp.map((t: number) => {
          const d = new Date(t * 1000);
          if (tf === '1D') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        });
        charts.push({
          timeframe: tf,
          chartUrl: buildChartUrl(symbol, tf, timestamps, cd.indicators.quote[0].close),
        });
      } else {
        charts.push({ timeframe: tf, chartUrl: null });
      }
    }

    // --- Section 3: Fundamentals ---
    const sd = safeGet(qsResult, 'summaryDetail', {});
    const fd = safeGet(qsResult, 'financialData', {});
    const dks = safeGet(qsResult, 'defaultKeyStatistics', {});
    const cal = safeGet(qsResult, 'calendarEvents', {});
    const fundamentals = {
      previous_close: sd.previousClose?.raw ?? prevClose,
      open: sd.open?.raw ?? quote?.regularMarketOpen,
      day_range: {
        low: sd.dayLow?.raw ?? quote?.regularMarketDayLow,
        high: sd.dayHigh?.raw ?? quote?.regularMarketDayHigh,
      },
      week_52_range: {
        low: dks.fiftyTwoWeekLow?.raw ?? quote?.fiftyTwoWeekLow,
        high: dks.fiftyTwoWeekHigh?.raw ?? quote?.fiftyTwoWeekHigh,
      },
      volume: sd.volume?.raw ?? quote?.regularMarketVolume,
      avg_volume: sd.averageVolume?.raw ?? dks.averageVolume?.raw,
      market_cap: sd.marketCap?.raw ?? fd.marketCap?.raw ?? quote?.marketCap,
      beta: dks.beta?.raw ?? fd.beta?.raw,
      pe_ratio: sd.trailingPE?.raw ?? dks.trailingPE?.raw ?? fd.trailingPE?.raw,
      eps: dks.trailingEps?.raw ?? fd.epsTrailingTwelveMonths?.raw,
      earnings_date: cal.earnings?.earningsDate?.raw
        ? new Date(cal.earnings.earningsDate.raw * 1000).toISOString()
        : (cal.earnings?.earningsDate ? new Date(cal.earnings.earningsDate).toISOString() : null),
      forward_dividend_yield: (() => {
        const div = sd.dividendRate?.raw ?? sd.dividendYield?.raw;
        const yieldVal = sd.dividendYield?.raw;
        if (div && yieldVal) return `${div} (${(yieldVal * 100).toFixed(2)}%)`;
        if (div) return String(div);
        if (yieldVal) return `(${(yieldVal * 100).toFixed(2)}%)`;
        return null;
      })(),
      ex_dividend_date: sd.exDividendDate?.raw
        ? new Date(sd.exDividendDate.raw * 1000).toISOString()
        : null,
      target_est: fd.targetMeanPrice?.raw ?? fd.targetPrice?.raw,
    };

    // --- Section 4: News & Filings ---
    const news = extractNewsFromSearch(searchNews);
    const secFilingsRaw = safeGet(qsResult, 'secFilings.filings', []);
    const filings = Array.isArray(secFilingsRaw) ? secFilingsRaw.slice(0, 10).map((f: any) => ({
      title: f.title || 'SEC Filing',
      type: f.type || f.formType || 'N/A',
      date: f.date ? new Date(f.date).toISOString() : null,
      url: f.edgarUrl || f.filingUrl || null,
    })) : [];

    // --- Section 5: Performance ---
    const perfTargetPrice = safeGet(fd, 'targetMeanPrice.raw');
    const perfHighPrice = safeGet(fd, 'targetHighPrice.raw');
    const perfLowPrice = safeGet(fd, 'targetLowPrice.raw');

    // --- Section 6: Earnings Trend Graphs ---
    const earningsHistory = safeGet(qsResult, 'earningsHistory.history', []);
    const earningsArr = safeGet(qsResult, 'earnings.earningsChart.quarterly', []);
    const financialsChart = safeGet(qsResult, 'earnings.financialsChart.quarterly', []);

    const epsQuarters: string[] = [];
    const epsActual: (number | null)[] = [];
    for (const e of earningsArr) {
      epsQuarters.push(e.date || '');
      epsActual.push(e.actual?.raw ?? e.actual ?? null);
    }

    const revQuarters: string[] = [];
    const revActual: (number | null)[] = [];
    const niActual: (number | null)[] = [];
    for (const f of financialsChart) {
      revQuarters.push(f.date || '');
      revActual.push(f.revenue?.raw ?? f.revenue ?? null);
      niActual.push(f.earnings?.raw ?? f.netIncome ?? null);
    }
    for (const h of earningsHistory) {
      const qLabel = h.quarter?.date || h.quarter || '';
      if (qLabel && !epsQuarters.includes(qLabel)) {
        epsQuarters.push(qLabel);
        epsActual.push(h.epsActual?.raw ?? h.actual ?? null);
      }
    }

    const epsChartUrl = buildEpsChartUrl(symbol, epsQuarters, epsActual);
    const revenueChartUrl = buildRevenueChartUrl(symbol, revQuarters, revActual, niActual);

    // --- Section 7: Analyst Insights ---
    const recTrend = safeGet(qsResult, 'recommendationTrend.trend', []);
    const latestRec = recTrend.length > 0 ? recTrend[recTrend.length - 1] : {};
    const allRecs = recTrend.reduce(
      (acc: { sb: number; b: number; h: number; s: number; ss: number }, r: any) => {
        acc.sb += r.strongBuy ?? 0;
        acc.b += r.buy ?? 0;
        acc.h += r.hold ?? 0;
        acc.s += r.sell ?? 0;
        acc.ss += r.strongSell ?? 0;
        return acc;
      },
      { sb: 0, b: 0, h: 0, s: 0, ss: 0 }
    );

    const insightRec = safeGet(insights, 'recommendation', {});
    const analysts = {
      price_target: {
        high: perfHighPrice ?? insightRec?.targetPrice?.high,
        median: perfTargetPrice ?? fd?.targetMeanPrice?.raw ?? insightRec?.targetPrice?.current,
        low: perfLowPrice ?? insightRec?.targetPrice?.low,
      },
      recommendation: {
        strong_buy: allRecs.sb || latestRec.strongBuy || 0,
        buy: allRecs.b || latestRec.buy || 0,
        hold: allRecs.h || latestRec.hold || 0,
        sell: allRecs.s || latestRec.sell || 0,
        strong_sell: allRecs.ss || latestRec.strongSell || 0,
      },
    };

    // --- Section 8: Statistics ---
    const ev = safeGet(fd, 'enterpriseValue.raw') ?? safeGet(dks, 'enterpriseValue.raw');
    const statistics = {
      market_cap: fundamentals.market_cap,
      enterprise_value: ev,
      trailing_pe: fundamentals.pe_ratio,
      forward_pe: fd.forwardPE?.raw ?? dks.forwardPE?.raw,
      peg_ratio: dks.pegRatio?.raw ?? fd.pegRatio?.raw,
      price_sales: fd.priceToSalesTrailing12Months?.raw ?? dks.priceToSalesTrailing12Months?.raw,
      price_book: fd.priceToBook?.raw ?? dks.priceToBook?.raw,
      ev_revenue: ev != null && fd.revenue?.raw ? parseFloat(String(ev / fd.revenue.raw)) : (dks.enterpriseToRevenue?.raw ?? null),
      ev_ebitda: dks.enterpriseToEbitda?.raw ?? null,
    };

    // --- Section 9: Financial Highlights ---
    const bsh = safeGet(qsResult, 'balanceSheetHistory.balanceSheetStatements[0]', {});
    const ish = safeGet(qsResult, 'incomeStatementHistory.incomeStatementHistory[0]', {});
    const csh = safeGet(qsResult, 'cashflowStatementHistory.cashflowStatements[0]', {});
    const financials = {
      profit_margin: fd.profitMargins?.raw ?? null,
      return_on_assets: fd.returnOnAssets?.raw ?? fd.returnOnAssetsTTM?.raw ?? null,
      return_on_equity: fd.returnOnEquity?.raw ?? fd.returnOnEquityTTM?.raw ?? null,
      revenue: fd.revenue?.raw ?? ish.totalRevenue?.raw ?? null,
      net_income: fd.netIncome?.raw ?? ish.netIncome?.raw ?? null,
      diluted_eps: fd.epsTrailingTwelveMonths?.raw ?? dks.trailingEps?.raw ?? null,
      total_cash: bsh.cash?.raw ?? bsh.cashAndCashEquivalents?.raw ?? fd.totalCash?.raw ?? null,
      total_debt_equity: fd.debtToEquity?.raw ?? null,
      levered_free_cash_flow: csh.freeCashFlow?.raw ?? fd.freeCashflow?.raw ?? null,
    };

    // --- Build response ---
    const companyName = safeGet(qsResult, 'price.longName')
      ?? quote?.longName
      ?? safeGet(qsResult, 'price.shortName')
      ?? quote?.shortName
      ?? symbol;

    const sector = safeGet(qsResult, 'summaryProfile.sector')
      ?? quote?.summaryProfile?.sector
      ?? quote?.sector
      ?? 'N/A';

    const industry = safeGet(qsResult, 'summaryProfile.industry')
      ?? quote?.summaryProfile?.industry
      ?? 'N/A';

    const description = safeGet(qsResult, 'summaryProfile.longBusinessSummary')
      ?? quote?.summaryProfile?.longBusinessSummary
      ?? null;

    return NextResponse.json({
      symbol,
      short_symbol: symbol.replace(/\.(NS|BO)$/, ''),
      exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
      company_name: companyName,
      sector,
      industry,
      price,
      change,
      change_percent: changePercent,
      market_status: marketStatus,
      description,
      charts,
      fundamentals,
      news,
      filings,
      performance: {
        week_52_high: fundamentals.week_52_range.high,
        week_52_low: fundamentals.week_52_range.low,
      },
      earnings_charts: {
        eps_trend_url: epsChartUrl,
        revenue_vs_net_income_url: revenueChartUrl,
      },
      analysts,
      statistics,
      financials,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch stock details' }, { status: 500 });
  }
}
