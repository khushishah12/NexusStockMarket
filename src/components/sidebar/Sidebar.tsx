'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Menu, X, LogOut, Loader2 } from 'lucide-react';
import { SIDEBAR_NAV_ITEMS } from './sidebarData';
import SidebarItem from './SidebarItem';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
    setLoggingOut(false);
  };

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

        <div className="flex items-center gap-2">
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
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-4 border-t border-white/10 px-4 pt-4 pb-10">
        {!collapsed && userEmail ? (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">User</p>
            <p className="truncate text-sm font-semibold text-slate-200">{userEmail}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Log out' : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 hover:text-white disabled:opacity-50"
        >
          {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  if (!mounted) {
    return <aside className="hidden w-[240px] shrink-0 lg:block" />;
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

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-50 hidden border-r border-white/10 bg-slate-950/75 backdrop-blur-xl lg:block"
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 w-[240px] border-r border-white/10 bg-slate-950/95 backdrop-blur-xl lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
