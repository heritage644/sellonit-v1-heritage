import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to your Sellonit account.',
};

export default function LoginPage() {
  return (
    <AuthShell nav={{ label: 'Create account', href: '/auth/register' }}>
      <LoginForm />
    </AuthShell>
  );
}
