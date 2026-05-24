'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getSupabaseEnv } from '../../lib/supabase/client';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!getSupabaseEnv().isConfigured) {
      setError(
        'Supabase is not configured. Create a project at supabase.com, copy URL + anon key into .env.local, then restart npm run dev. See supabase/SETUP.md in this repo.'
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {searchParams.get('error') === 'config' && (
        <div className="auth-alert auth-alert--warn">
          Supabase is not configured. Add keys to <code>.env.local</code>.
        </div>
      )}
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </label>

      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 size={16} className="spin" /> Signing in…
          </>
        ) : (
          <>
            <LogIn size={16} /> Log in
          </>
        )}
      </button>

      <p className="auth-switch">
        Don&apos;t have an account?{' '}
        <Link href="/signup">Sign up</Link>
      </p>
    </form>
  );
}
