'use client';

import React, { useState } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import SignupForm from '../../components/auth/SignupForm';
import PasswordRules from '../../components/auth/PasswordRules';

export default function SignupPage() {
  const [password, setPassword] = useState('');

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join NEXUS.AI and unlock the full 3D market dashboard."
      sidePanel={<PasswordRules password={password} />}
    >
      <SignupForm onPasswordChange={setPassword} />
    </AuthLayout>
  );
}
