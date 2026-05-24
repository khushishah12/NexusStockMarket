'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getSupabaseEnv } from '../../lib/supabase/client';
import { ensureUserProfile } from '../../lib/auth/profile';
import { isPasswordValid } from '../../lib/auth/passwordRules';
import { UserPlus, Loader2 } from 'lucide-react';

interface SignupFormProps {
  onPasswordChange?: (password: string) => void;
}

export default function SignupForm({ onPasswordChange }: SignupFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isPasswordValid(password)) {
      setError('Please meet all password requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!getSupabaseEnv().isConfigured) {
      setError(
        'Supabase is not configured. Add keys to .env.local and restart npm run dev. See supabase/SETUP.md.'
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const trimmedEmail = email.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (!data.user) {
      setLoading(false);
      setError('Sign up failed. Please try again.');
      return;
    }

    const profileResult = await ensureUserProfile(
      supabase,
      data.user.id,
      trimmedEmail,
      fullName.trim()
    );

    if (!profileResult.ok) {
      setLoading(false);
      setError(profileResult.error ?? 'Could not save your profile to the database.');
      return;
    }

    if (!data.session) {
      setLoading(false);
      setSuccess(
        'Account created. Check your email to confirm, then log in with the same password.'
      );
      router.push(`/login?registered=1&email=${encodeURIComponent(trimmedEmail)}`);
      return;
    }

    setLoading(false);
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {success && <div className="auth-alert auth-alert--warn">{success}</div>}

      <label className="auth-field">
        <span>Full name</span>
        <input
          type="text"
          name="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Alex Morgan"
        />
      </label>

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
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            onPasswordChange?.(e.target.value);
          }}
          placeholder="••••••••"
        />
      </label>

      <label className="auth-field">
        <span>Confirm password</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        className="auth-submit auth-submit--signup"
        disabled={loading || !isPasswordValid(password)}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="spin" /> Creating account…
          </>
        ) : (
          <>
            <UserPlus size={16} /> Sign up
          </>
        )}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
