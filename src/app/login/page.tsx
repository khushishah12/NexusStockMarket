'use client';

import React, { Suspense } from 'react';
import LoginForm from '../../components/auth/LoginForm';
import Link from 'next/link';

function LoginFormContainer() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-t-2xl" />
      <LoginForm />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 bg-[#030308] text-white">
      {/* Background decorations matching the dashboard */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,229,255,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(255,51,102,0.06),transparent_50%)]" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#00ff88] animate-pulse" />
            <span className="text-xl font-bold tracking-widest text-white">
              NEXUS<span className="text-emerald-400">.AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-2">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Sign in to access your NEXUS terminal and market intelligence.
          </p>
        </div>

        <Suspense fallback={
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 md:p-8 shadow-2xl backdrop-blur-xl flex justify-center items-center h-48">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        }>
          <LoginFormContainer />
        </Suspense>
      </div>
    </div>
  );
}
