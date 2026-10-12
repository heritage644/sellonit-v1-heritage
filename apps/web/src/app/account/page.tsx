import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AccountPanel } from '@/components/auth/AccountPanel';

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Your Sellonit account.',
};

export default function AccountPage() {
  return (
    <AuthShell>
      <AccountPanel />
    </AuthShell>
  );
}
