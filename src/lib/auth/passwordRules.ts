export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'One special character (!@#$%^&* etc.)',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}
