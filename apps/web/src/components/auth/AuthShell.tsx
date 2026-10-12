import Link from 'next/link';
import type { ReactNode } from 'react';

export type AuthShellProps = {
  children: ReactNode;
  /** Small navigation element in the upper-right area of the page. */
  nav?: { label: string; href: string };
};

/**
 * Shared authentication page chrome: the Sellonit wordmark in the upper-left,
 * an optional navigation element in the upper-right and a compact white card
 * centred in the remaining content area.
 */
export function AuthShell({ children, nav }: AuthShellProps) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link href="/" className="wordmark" aria-label="Sellonit home">
          Sellonit
        </Link>
        {nav ? (
          <Link href={nav.href} className="auth-nav">
            {nav.label}
          </Link>
        ) : null}
      </header>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
