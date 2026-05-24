'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getSupabaseEnv } from '../../lib/supabase/client';
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        'Supabase is not configured. Create a project at supabase.com, copy URL + anon key into .env.local, then restart npm run dev. See supabase/SETUP.md in this repo.'
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

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
