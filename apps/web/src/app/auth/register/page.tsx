import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { CreateAccountForm } from '@/components/auth/CreateAccountForm';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create your Sellonit account with your phone number.',
};

export default function RegisterPage() {
  return (
    <AuthShell nav={{ label: 'Log in', href: '/auth/login' }}>
      <CreateAccountForm />
    </AuthShell>
  );
}
