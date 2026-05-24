'use client';

import React, { Suspense } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your NEXUS terminal and market intelligence."
    >
      <Suspense fallback={<div className="auth-loading">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
