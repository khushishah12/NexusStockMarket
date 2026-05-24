'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LogOut, Loader2 } from 'lucide-react';

interface LogoutButtonProps {
  collapsed?: boolean;
}

export default function LogoutButton({ collapsed = false }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      title={collapsed ? 'Log out' : undefined}
      className={`flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 hover:text-white disabled:opacity-50 ${
        collapsed ? 'px-2' : ''
      }`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
      {!collapsed && <span>Log out</span>}
    </button>
  );
}
