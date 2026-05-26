'use client';

import { useEffect, useState } from 'react';
import { useSidebar } from '../../hooks/useSidebar';
import Sidebar from '../sidebar/Sidebar';
import { createClient } from '../../lib/supabase/client';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useSidebar();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user) {
          setEmail(data.user.email ?? null);

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .maybeSingle();

            if (!profile) {
              await supabase.from('profiles').insert({
                id: data.user.id,
                name:
                  data.user.user_metadata?.name ||
                  data.user.email?.split('@')[0] ||
                  'User',
                email: data.user.email ?? '',
              });
            }
          } catch (profileErr) {
            console.error('Error checking/auto-creating profile:', profileErr);
          }
        }
      });
    } catch (err) {
      console.warn('Supabase client failed to initialize or fetch user:', err);
    }
  }, []);

  const desktopSidebarWidth = sidebar.collapsed ? 80 : 240;
  const mobileOpenStyle = sidebar.mobileOpen
    ? {
        marginLeft: '240px',
        width: 'calc(100% - 240px)',
      }
    : {};

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030308] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,229,255,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(255,51,102,0.06),transparent_50%)]" />
      <Sidebar {...sidebar} userEmail={email} />
      <main
        style={{
          ...mobileOpenStyle,
          '--sidebar-width': `${desktopSidebarWidth}px`,
        } as unknown as React.CSSProperties}
        className="dashboard-main relative min-h-screen pt-16 transition-all duration-300 ease-out md:pt-0"
      >
        <div className="mx-auto max-w-[1400px] min-w-0 px-4 py-8 md:px-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
