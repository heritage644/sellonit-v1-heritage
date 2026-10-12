import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { VerifyPhoneForm } from '@/components/auth/VerifyPhoneForm';

export const metadata: Metadata = {
  title: 'Verify your phone number',
  description: 'Enter the 6-digit code we sent to your phone.',
};

type VerifyPageProps = {
  searchParams: Promise<{ phone?: string | string[] }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const phone = typeof params.phone === 'string' ? params.phone : null;
  return (
    <AuthShell nav={{ label: 'Log in', href: '/auth/login' }}>
      <VerifyPhoneForm phone={phone} />
    </AuthShell>
  );
}
