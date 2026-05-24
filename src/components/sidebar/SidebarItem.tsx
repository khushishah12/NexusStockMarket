'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ACCENT_STYLES, type SidebarNavItem } from './sidebarData';

interface SidebarItemProps {
  item: SidebarNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}

export default function SidebarItem({ item, collapsed, onNavigate }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href);

  const accent = ACCENT_STYLES[item.accent];
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
        isActive
          ? `bg-white/[0.08] ${accent.glow}`
          : 'hover:bg-white/[0.05] hover:scale-[1.02]'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active-bar"
          className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b ${accent.active}`}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}

      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 transition-transform group-hover:scale-110 ${
          isActive ? accent.icon : 'text-slate-400 group-hover:text-white'
        }`}
      >
        <Icon size={18} />
      </span>

      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-semibold ${
              isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
            }`}
          >
            {item.label}
          </span>
          <span className="block truncate text-[10px] text-slate-500">{item.description}</span>
        </span>
      )}

      {collapsed && (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-white/10 bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl group-hover:block">
          <span className="font-semibold">{item.label}</span>
          <span className="mt-0.5 block text-slate-400">{item.description}</span>
        </span>
      )}
    </Link>
  );
}
