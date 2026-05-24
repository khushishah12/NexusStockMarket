'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Menu, X, Home } from 'lucide-react';
import { SIDEBAR_NAV_ITEMS } from './sidebarData';
import SidebarItem from './SidebarItem';
import LogoutButton from '../auth/LogoutButton';

export interface SidebarControlProps {
  collapsed: boolean;
  mobileOpen: boolean;
  mounted: boolean;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

interface SidebarProps extends SidebarControlProps {
  userEmail?: string | null;
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  mounted,
  toggleCollapsed,
  openMobile,
  closeMobile,
  userEmail,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMobile}>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#00ff88]" />
          {!collapsed && (
            <span className="text-sm font-bold tracking-widest text-white">
              NEXUS<span className="text-emerald-400">.AI</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden rounded-md border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button
          type="button"
          onClick={closeMobile}
          className="rounded-md p-1.5 text-slate-400 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <Link
          href="/"
          onClick={closeMobile}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Home size={16} />
          {!collapsed && <span>3D Terminal</span>}
        </Link>
        {userEmail && !collapsed && (
          <p className="truncate px-2 text-[10px] text-slate-500">{userEmail}</p>
        )}
        <LogoutButton collapsed={collapsed} />
      </div>
    </div>
  );

  if (!mounted) {
    return <aside className="hidden w-[280px] shrink-0 lg:block" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        className="fixed left-4 top-4 z-40 rounded-lg border border-white/10 bg-slate-900/90 p-2 text-white backdrop-blur lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-50 hidden border-r border-white/10 bg-slate-950/75 backdrop-blur-xl lg:block"
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/10 bg-slate-950/95 backdrop-blur-xl lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
