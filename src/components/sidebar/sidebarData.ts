import {
  LayoutDashboard,
  LineChart,
  Brain,
  BarChart3,
  Newspaper,
  Star,
  ShieldAlert,
  Database,
  type LucideIcon,
} from 'lucide-react';

export type SidebarAccent = 'neutral' | 'bullish' | 'bearish';

export type SidebarItemType = 'link' | 'action';

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  accent: SidebarAccent;
  description: string;
  type?: SidebarItemType;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    accent: 'neutral',
    description: 'Market overview & AI summary',
  },
  {
    id: 'markets',
    label: 'Markets',
    href: '/dashboard/markets',
    icon: LineChart,
    accent: 'bullish',
    description: 'NSE / BSE stocks & filters',
  },
  {
    id: 'predictions',
    label: 'AI Predictions',
    href: '/dashboard/predictions',
    icon: Brain,
    accent: 'bullish',
    description: 'Buy/sell probability & trends',
  },
  {
    id: 'charts',
    label: 'Charts',
    href: '/dashboard/charts',
    icon: BarChart3,
    accent: 'neutral',
    description: 'Candlesticks & indicators',
  },
  {
    id: 'news',
    label: 'News & Sentiment',
    href: '/dashboard/news',
    icon: Newspaper,
    accent: 'neutral',
    description: 'Feeds & AI sentiment',
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    href: '/dashboard/watchlist',
    icon: Star,
    accent: 'bullish',
    description: 'Saved stocks & quick access',
  },
  {
    id: 'risk',
    label: 'Risk Analysis',
    href: '/dashboard/risk',
    icon: ShieldAlert,
    accent: 'bearish',
    description: 'Portfolio risk & volatility',
  },
  {
    id: 'add-script',
    label: 'Add Script',
    href: '#',
    icon: Database,
    accent: 'bullish',
    description: 'Discover & save NSE/BSE stocks',
    type: 'action',
  },
];

export const ACCENT_STYLES: Record<
  SidebarAccent,
  { active: string; glow: string; icon: string }
> = {
  neutral: {
    active: 'from-cyan-500/80 to-violet-500/80',
    glow: 'shadow-[0_0_20px_rgba(0,229,255,0.25)]',
    icon: 'text-cyan-400',
  },
  bullish: {
    active: 'from-emerald-400/90 to-cyan-400/80',
    glow: 'shadow-[0_0_20px_rgba(0,255,136,0.3)]',
    icon: 'text-emerald-400',
  },
  bearish: {
    active: 'from-rose-500/90 to-orange-500/70',
    glow: 'shadow-[0_0_20px_rgba(255,51,102,0.35)]',
    icon: 'text-rose-400',
  },
};
