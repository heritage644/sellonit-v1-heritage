import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Logo } from '@/components/reuseable/logo';

export type AuthShellProps = {
  children: ReactNode;
  /** Small navigation link in the upper-right area of the page. */
  nav?: { label: string; href: string };
};

/**
 * Shared authentication page chrome: the Sellonit logo in the upper-left, an
 * optional navigation link in the upper-right and a white card centred in the
 * remaining content area. Scales from phones (full-width card) to desktops.
 */
export function AuthShell({ children, nav }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <Link
          href="/"
          aria-label="Sellonit home"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
        >
          <Logo />
        </Link>
        {nav ? (
          <Link
            href={nav.href}
            className="rounded-md text-sm font-semibold text-foreground underline-offset-3 outline-none hover:text-primary-hover hover:underline focus-visible:ring-3 focus-visible:ring-primary/40"
          >
            {nav.label}
          </Link>
        ) : null}
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pt-2 pb-10 sm:px-6 sm:pb-14">
        <Card className="max-w-[420px] p-6 sm:p-8">{children}</Card>
      </main>
    </div>
  );
}
