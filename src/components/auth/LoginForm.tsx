'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, getSupabaseEnv } from '../../lib/supabase/client';
import { profileExists } from '../../lib/auth/profile';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const registered = searchParams.get('registered') === '1';
  const prefilledEmail = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (registered) {
      setInfo('Sign up successful. Log in with your email and password.');
    }
  }, [registered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!getSupabaseEnv().isConfigured) {
      setError(
        'Supabase is not configured. Add keys to .env.local and restart npm run dev. See supabase/SETUP.md.'
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      const msg = signInError.message.toLowerCase();
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Invalid email or password. Sign up first if you do not have an account.');
      } else {
        setError(signInError.message);
      }
      return;
    }

    if (!data.user || !data.session) {
      setLoading(false);
      setError('Login failed. Please sign up or confirm your email first.');
      return;
    }

    const hasProfile = await profileExists(supabase, data.user.id);

    if (!hasProfile) {
      await supabase.auth.signOut();
      setLoading(false);
      setError('No account found in our database. Please sign up first.');
      return;
    }

    setLoading(false);
    router.push(redirectTo.startsWith('/') ? redirectTo : '/dashboard');
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {searchParams.get('error') === 'config' && (
        <div className="auth-alert auth-alert--warn">
          Supabase is not configured. Add keys to <code>.env.local</code>.
        </div>
      )}
      {info && <div className="auth-alert auth-alert--warn">{info}</div>}
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
