'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import {
  PASSWORD_RULES,
  getPasswordStrength,
} from '../../lib/auth/passwordRules';

interface PasswordRulesProps {
  password: string;
}

export default function PasswordRules({ password }: PasswordRulesProps) {
  const strength = getPasswordStrength(password);
  const strengthLabel =
    strength <= 1 ? 'Weak' : strength <= 3 ? 'Fair' : strength <= 4 ? 'Good' : 'Strong';

  return (
    <div className="password-rules">
      <h2 className="password-rules-title">Password requirements</h2>
      <p className="password-rules-desc">
        Create a secure password for your NEXUS terminal. All rules must be met before you can sign up.
      </p>

      <div className="password-strength">
        <div className="password-strength-label">
          <span>Strength</span>
          <span className={`strength-tag strength-${strength}`}>{strengthLabel}</span>
        </div>
        <div className="password-strength-bars">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`strength-bar ${i <= strength ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      <ul className="password-rules-list">
        {PASSWORD_RULES.map((rule) => {
          const passed = rule.test(password);
          return (
            <li key={rule.id} className={passed ? 'rule-pass' : 'rule-fail'}>
              {passed ? (
                <Check size={14} className="rule-icon" />
              ) : (
                <X size={14} className="rule-icon" />
              )}
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="password-rules-tip">
        <strong>Tip:</strong> Use a unique passphrase you do not reuse on other sites.
      </div>
    </div>
  );
}
