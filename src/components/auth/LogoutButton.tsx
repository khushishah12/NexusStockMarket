'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
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
      className="dashboard-logout-btn"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? <Loader2 size={14} className="spin" /> : <LogOut size={14} />}
      Log out
    </button>
  );
}
