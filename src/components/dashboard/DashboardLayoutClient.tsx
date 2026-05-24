'use client';

import { useEffect, useState } from 'react';
import { useSidebar } from '../../hooks/useSidebar';
import Sidebar from '../sidebar/Sidebar';
import { createClient, getSupabaseEnv } from '../../lib/supabase/client';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useSidebar();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!getSupabaseEnv().isConfigured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const plClass = sidebar.collapsed ? 'lg:pl-20' : 'lg:pl-[280px]';

  return (
    <div className="min-h-screen bg-[#030308] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,229,255,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(255,51,102,0.06),transparent_50%)]" />
      <Sidebar {...sidebar} userEmail={email} />
      <main
        className={`relative min-h-screen pt-16 transition-[padding] duration-300 ease-out lg:pt-0 ${plClass}`}
      >
        <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
