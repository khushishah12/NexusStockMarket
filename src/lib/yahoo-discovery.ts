import YahooFinance from 'yahoo-finance2';

export const yahooFinance = new YahooFinance();

export const INDIAN_SUFFIXES = ['.NS', '.BO'];

export function isIndianSymbol(symbol: string): boolean {
  return INDIAN_SUFFIXES.some((s) => symbol.endsWith(s));
}

export function getExchangeFromSymbol(symbol: string): string {
  return symbol.endsWith('.BO') ? 'BSE' : 'NSE';
}

export const ALL_SCRAPES = [
  'most_actives', 'day_gainers', 'day_losers', 'undervalued_growth_stocks',
  'undervalued_large_caps', 'aggressive_small_caps', 'growth_technology_stocks',
  'most_shorted_stocks', 'portfolio_anchors', 'small_cap_gainers',
  'solid_large_growth_funds', 'solid_midcap_growth_funds',
  'conservative_foreign_funds', 'high_yield_bond', 'top_mutual_funds',
] as const;

export const SEARCH_TERMS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  'India', 'Limited', 'Ltd', 'Bank', 'Technologies', 'Services',
  'Pharma', 'Chemicals', 'Steel', 'Auto', 'Energy', 'Power',
  'Finance', 'Insurance', 'Hospital', 'Healthcare', 'Food',
  'Consumer', 'Media', 'Entertainment', 'Infrastructure',
  'Engineering', 'Construction', 'Textiles', 'Mining', 'Metals',
  'Telecom', 'Software', 'Electronics', 'Logistics', 'Shipping',
  'Aviation', 'Defence', 'Hotels', 'Retail', 'Realty',
];

export const FALLBACK_SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'WIPRO.NS', 'LT.NS',
  'HINDUNILVR.NS', 'NTPC.NS', 'ONGC.NS', 'POWERGRID.NS', 'TITAN.NS',
  'BAJFINANCE.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TATAMOTORS.NS', 'AXISBANK.NS',
  'KOTAKBANK.NS', 'ULTRACEMCO.NS', 'ASIANPAINT.NS', 'NESTLEIND.NS', 'M&M.NS',
  'JSWSTEEL.NS', 'TATASTEEL.NS', 'COALINDIA.NS', 'BPCL.NS', 'GRASIM.NS',
  'ADANIPORTS.NS', 'HCLTECH.NS', 'TECHM.NS', 'INDUSINDBK.NS', 'BAJAJFINSV.NS',
  'TRENT.NS', 'DLF.NS', 'PIDILITIND.NS', 'HINDALCO.NS', 'EICHERMOT.NS',
  'BRITANNIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS', 'CIPLA.NS', 'APOLLOHOSP.NS',
  'SBILIFE.NS', 'ICICIPRULI.NS', 'HDFCLIFE.NS', 'MARICO.NS', 'DABUR.NS',
  'VEDL.NS', 'HAL.NS', 'BEL.NS', 'IOC.NS', 'GAIL.NS',
  'HEROMOTOCO.NS', 'BAJAJ-AUTO.NS', 'TVSMOTOR.NS', 'PAGEIND.NS', 'SRTRANSFIN.NS',
  'MCDOWELL-N.NS', 'COLPAL.NS', 'GODREJCP.NS', 'HAVELLS.NS', 'AMBUJACEM.NS',
  'ACC.NS', 'SHREECEM.NS', 'SIEMENS.NS', 'BHEL.NS', 'DMART.NS',
  'ZOMATO.NS', 'PAYTM.NS', 'NYKAA.NS', 'ICICIGI.NS', 'LICI.NS',
  'IRCTC.NS', 'BANDHANBNK.NS', 'PNB.NS', 'BANKBARODA.NS', 'CANBK.NS',
  'IDFCFIRSTB.NS', 'AUBANK.NS', 'INDIAMART.NS', 'PERSISTENT.NS', 'LTTS.NS',
  'LUPIN.NS', 'TORNTPHARM.NS', 'AUROPHARMA.NS', 'BIOCON.NS', 'ALKEM.NS',
  'BERGEPAINT.NS', 'FEDERALBNK.NS', 'RBLBANK.NS', 'VOLTAS.NS', 'ABB.NS',
  'POLYCAB.NS', 'AARTIIND.NS', 'MUTHOOTFIN.NS', 'PEL.NS', 'MFSL.NS',
  'RELIANCE.BO', 'TCS.BO', 'HDFCBANK.BO', 'ICICIBANK.BO', 'SBIN.BO',
  'INFY.BO', 'BHARTIARTL.BO', 'ITC.BO', 'WIPRO.BO', 'LT.BO',
  'HINDUNILVR.BO', 'NTPC.BO', 'ONGC.BO', 'POWERGRID.BO', 'TITAN.BO',
  'MARUTI.BO', 'SUNPHARMA.BO', 'AXISBANK.BO', 'KOTAKBANK.BO', 'ULTRACEMCO.BO',
  'ASIANPAINT.BO', 'M&M.BO', 'TATASTEEL.BO', 'HCLTECH.BO', 'BAJFINANCE.BO',
  'ADANIPORTS.BO', 'NESTLEIND.BO', 'HINDALCO.BO', 'GRASIM.BO', 'JSWSTEEL.BO',
  'TATAMOTORS.BO', 'TATAPOWER.BO', 'INDUSINDBK.BO', 'TECHM.BO',
  'BRITANNIA.BO', 'DRREDDY.BO', 'CIPLA.BO', 'BAJAJFINSV.BO', 'SBILIFE.BO',
  'EICHERMOT.BO', 'DIVISLAB.BO', 'APOLLOHOSP.BO', 'COALINDIA.BO', 'BPCL.BO',
  'IOC.BO', 'GAIL.BO', 'HEROMOTOCO.BO', 'DMART.BO',
];

export async function discoverViaSearch(): Promise<Set<string>> {
  const discovered = new Set<string>();
  const BATCH_SIZE = 10;

  for (let i = 0; i < SEARCH_TERMS.length; i += BATCH_SIZE) {
    const batch = SEARCH_TERMS.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((term) =>
        yahooFinance.search(term, { region: 'IN', quotesCount: 20 })
      )
    );
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      for (const q of s.value.quotes) {
        if ('symbol' in q && typeof q.symbol === 'string' && isIndianSymbol(q.symbol)) {
          discovered.add(q.symbol);
        }
      }
    }
  }
  return discovered;
}

export async function discoverViaScreener(): Promise<Set<string>> {
  const discovered = new Set<string>();

  for (let i = 0; i < ALL_SCRAPES.length; i += 5) {
    const batch = ALL_SCRAPES.slice(i, i + 5);
    const settled = await Promise.allSettled(
      batch.map((scrId) =>
        yahooFinance.screener({ scrIds: scrId as any, count: 250 })
      )
    );
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue;
      for (const q of s.value.quotes) {
        if (isIndianSymbol(q.symbol)) {
          discovered.add(q.symbol);
        }
      }
      const total = s.value.total;
      if (total > 250) {
        const extraPages = Math.min(Math.ceil((total - 250) / 250), 1);
        for (let p = 0; p < extraPages; p++) {
          try {
            const pageResult = await yahooFinance.screener({
              scrIds: batch[settled.indexOf(s)] as any,
              count: 250,
              start: 250 + p * 250,
            });
            for (const q of pageResult.quotes) {
              if (isIndianSymbol(q.symbol)) {
                discovered.add(q.symbol);
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  }
  return discovered;
}

export async function fetchQuotesInBatches(symbols: string[]): Promise<{
  symbol: string; exchange: string; sector: string; industry: string;
  company_name: string; price: number | undefined; volume: number | undefined;
}[]> {
  const results: {
    symbol: string; exchange: string; sector: string; industry: string;
    company_name: string; price: number | undefined; volume: number | undefined;
  }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < symbols.length; i += 50) {
    const batch = symbols.slice(i, i + 50);
    try {
      const quotes = await yahooFinance.quote(batch);
      for (const q of quotes) {
        if (seen.has(q.symbol)) continue;
        seen.add(q.symbol);
        results.push({
          symbol: q.symbol,
          exchange: getExchangeFromSymbol(q.symbol),
          sector: q.summaryProfile?.sector ?? q.sector ?? 'N/A',
          industry: q.summaryProfile?.industry ?? q.industry ?? 'N/A',
          company_name: q.longName ?? q.shortName ?? q.symbol,
          price: q.regularMarketPrice,
          volume: q.regularMarketVolume,
        });
      }
    } catch {
      try {
        for (const sym of batch) {
          try {
            const q = await yahooFinance.quote(sym);
            if (seen.has(q.symbol)) continue;
            seen.add(q.symbol);
            results.push({
              symbol: q.symbol,
              exchange: getExchangeFromSymbol(q.symbol),
              sector: q.summaryProfile?.sector ?? q.sector ?? 'N/A',
              industry: q.summaryProfile?.industry ?? q.industry ?? 'N/A',
              company_name: q.longName ?? q.shortName ?? q.symbol,
              price: q.regularMarketPrice,
              volume: q.regularMarketVolume,
            });
          } catch { /* skip single failure */ }
        }
      } catch { /* skip batch */ }
    }
  }
  return results;
}

export async function discoverIndianSymbols(): Promise<Set<string>> {
  let allSymbols = new Set<string>();

  const [searchSymbols, screenerSymbols] = await Promise.all([
    discoverViaSearch().catch(() => new Set<string>()),
    discoverViaScreener().catch(() => new Set<string>()),
  ]);

  for (const s of searchSymbols) allSymbols.add(s);
  for (const s of screenerSymbols) allSymbols.add(s);

  if (allSymbols.size < 50) {
    for (const sym of FALLBACK_SYMBOLS) {
      allSymbols.add(sym);
    }
  }

  return allSymbols;
}
