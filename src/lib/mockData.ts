export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBullish: boolean;
}

export interface AISignal {
  type: 'bullish' | 'bearish';
  confidence: number;
  buyProbability: number;
  sentimentScore: number;
  message: string;
}

export interface NewsArticle {
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  source: string;
  time: string;
}

export interface Indicators {
  rsi: number;
  macd: {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  };
  ema: {
    ema9: number[];
    ema21: number[];
  };
}

// Generate 20 candles simulating a dynamic chart with an upward-trending midsection
export const generateMockCandles = (): Candle[] => {
  const basePrice = 150;
  const candles: Candle[] = [];
  let currentPrice = basePrice;

  const priceFluctuations = [
    -2, 3, -1, 4, 2, -3, 5, 4, -2, 6, 
    3, -1, -4, 2, 5, 4, -2, 6, 8, -3
  ];

  for (let i = 0; i < 20; i++) {
    const change = priceFluctuations[i];
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 2 + 0.5;
    const low = Math.min(open, close) - Math.random() * 2 - 0.5;
    const volume = Math.round(50000 + Math.random() * 100000);
    
    candles.push({
      time: `10:${i < 10 ? '0' + i : i}`,
      open,
      high,
      low,
      close,
      volume,
      isBullish: close >= open
    });

    currentPrice = close;
  }

  return candles;
};

export const mockCandles = generateMockCandles();

export const mockAISignal: AISignal = {
  type: 'bullish',
  confidence: 0.88,
  buyProbability: 92.4,
  sentimentScore: 0.76,
  message: 'Bullish breakout pattern confirmed. AI signals high buy probability with strong upward momentum.'
};

export const mockNews: NewsArticle[] = [
  {
    title: 'NEXUS Stocks Surge 8% on Record Earnings & AI Expansion',
    sentiment: 'positive',
    source: 'TechCrunch',
    time: '2 mins ago'
  },
  {
    title: 'Federal Reserve Signals Interest Rate Pause in June',
    sentiment: 'positive',
    source: 'Bloomberg',
    time: '15 mins ago'
  },
  {
    title: 'Chip Supply Chain Delays Threaten Hardware Output',
    sentiment: 'negative',
    source: 'Reuters',
    time: '1 hour ago'
  },
  {
    title: 'NEXUS Announces New Custom Silicon for Cloud Computing',
    sentiment: 'positive',
    source: 'Wired',
    time: '3 hours ago'
  },
  {
    title: 'Stock Market Volumes Remain Steady Ahead of Option Expiry',
    sentiment: 'neutral',
    source: 'MarketWatch',
    time: '5 hours ago'
  },
  {
    title: 'Competitor Launch Fails to Slow Down NEXUS Dashboard Signups',
    sentiment: 'positive',
    source: 'VentureBeat',
    time: '7 hours ago'
  }
];

export const mockIndicators: Indicators = {
  rsi: 68.5,
  macd: {
    macdLine: [1.2, 1.5, 1.8, 2.1, 2.3, 2.4, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.0, 3.1, 3.3, 3.5, 3.8, 4.0, 4.1, 4.3],
    signalLine: [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.3, 3.4, 3.6, 3.8],
    histogram: [0.4, 0.5, 0.6, 0.7, 0.7, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.3, 0.3, 0.4, 0.4, 0.5, 0.6, 0.5, 0.5]
  },
  ema: {
    ema9: [149.5, 150.2, 150.1, 151.3, 152.0, 151.2, 152.8, 153.6, 153.2, 155.0, 156.1, 156.0, 155.2, 155.8, 157.2, 158.4, 158.0, 159.8, 162.2, 161.4],
    ema21: [149.0, 149.5, 149.6, 150.2, 150.8, 150.4, 151.3, 152.0, 151.8, 153.0, 153.8, 153.9, 153.5, 153.9, 154.8, 155.6, 155.5, 156.6, 158.2, 157.8]
  }
};
