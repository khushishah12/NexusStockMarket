import { create } from 'zustand';
import { Candle, AISignal, NewsArticle, Indicators, mockCandles, mockAISignal, mockNews, mockIndicators } from '../lib/mockData';

interface MarketState {
  candles: Candle[];
  aiSignal: AISignal;
  news: NewsArticle[];
  indicators: Indicators;
  hoveredCandle: Candle | null;
  selectedCandle: Candle | null;
  activeSection: number; // 0 to 4
  bullReacting: boolean;
  bearReacting: boolean;
  pulseIndex: number;
  livePrice: number;
  scrollOffset: number;
  heroScrollProgress: number;
  sceneRotation: number;
  expandedHoloCard: string | null;
  bullishWaveActive: boolean;
  patternHighlight: boolean;

  setHoveredCandle: (candle: Candle | null) => void;
  setSelectedCandle: (candle: Candle | null) => void;
  setActiveSection: (section: number) => void;
  setBullReacting: (reacting: boolean) => void;
  setBearReacting: (reacting: boolean) => void;
  setPulseIndex: (index: number) => void;
  setScrollOffset: (offset: number) => void;
  setHeroScrollProgress: (progress: number) => void;
  rotateScene: () => void;
  setExpandedHoloCard: (id: string | null) => void;
  triggerBullishWave: () => void;
  setPatternHighlight: (on: boolean) => void;
  triggerAISignal: (type: 'bullish' | 'bearish') => void;
  fetchData: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  candles: mockCandles,
  aiSignal: mockAISignal,
  news: mockNews,
  indicators: mockIndicators,
  hoveredCandle: null,
  selectedCandle: null,
  activeSection: 0,
  bullReacting: false,
  bearReacting: false,
  pulseIndex: -1,
  livePrice: mockCandles[mockCandles.length - 1].close,
  scrollOffset: 0,
  heroScrollProgress: 0,
  sceneRotation: 0,
  expandedHoloCard: null,
  bullishWaveActive: false,
  patternHighlight: false,

  setHoveredCandle: (candle) => set({ hoveredCandle: candle }),
  setSelectedCandle: (candle) => set({ selectedCandle: candle }),
  setActiveSection: (section) => set({ activeSection: section }),
  setBullReacting: (reacting) => set({ bullReacting: reacting }),
  setBearReacting: (reacting) => set({ bearReacting: reacting }),
  setPulseIndex: (index) => set({ pulseIndex: index }),
  setScrollOffset: (offset) => set({ scrollOffset: offset }),
  setHeroScrollProgress: (progress) => set({ heroScrollProgress: progress }),
  rotateScene: () =>
    set((s) => ({ sceneRotation: s.sceneRotation + Math.PI * 0.125 })),
  setExpandedHoloCard: (id) => set({ expandedHoloCard: id }),
  setPatternHighlight: (on) => set({ patternHighlight: on }),
  triggerBullishWave: () => {
    set({ bullishWaveActive: true });
    setTimeout(() => set({ bullishWaveActive: false }), 1400);
  },

  triggerAISignal: (type) => {
    if (type === 'bullish') {
      set({ bullReacting: true, patternHighlight: true });
      get().triggerBullishWave();
      setTimeout(() => set({ bullReacting: false, patternHighlight: false }), 2000);
    } else {
      set({ bearReacting: true });
      setTimeout(() => set({ bearReacting: false }), 2000);
    }
  },

  fetchData: async () => {
    try {
      // In a real app, this would query Next.js API endpoints.
      // We implement API fetching with standard mock fallbacks.
      const [candlesRes, signalRes, newsRes, indicatorsRes] = await Promise.all([
        fetch('/api/market-data').catch(() => null),
        fetch('/api/ai-prediction').catch(() => null),
        fetch('/api/news').catch(() => null),
        fetch('/api/indicators').catch(() => null),
      ]);

      const candles = candlesRes ? await candlesRes.json() : mockCandles;
      const aiSignal = signalRes ? await signalRes.json() : mockAISignal;
      const news = newsRes ? await newsRes.json() : mockNews;
      const indicators = indicatorsRes ? await indicatorsRes.json() : mockIndicators;

      set({
        candles,
        aiSignal,
        news,
        indicators,
        livePrice: candles[candles.length - 1]?.close || get().livePrice,
      });
    } catch (e) {
      console.warn("Failed to fetch API routes, using local mock data", e);
      // Fallback is already initialized in state
    }
  },
}));
