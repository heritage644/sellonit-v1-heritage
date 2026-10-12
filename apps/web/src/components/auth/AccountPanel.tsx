'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getMe } from '@/lib/auth/api';
import { ApiError } from '@/lib/api-client';
import { formatPhoneDisplay } from '@/lib/auth/validation';
import type { AuthUser } from '@/lib/auth/types';

type PanelState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'error' }
  | { status: 'user'; user: AuthUser };

/**
 * Minimal signed-in confirmation. It only reads GET /auth/me with the
 * browser-managed session cookie; no tokens are stored or read client-side.
 * The backend does not expose a logout endpoint, so none is offered.
 */
export function AccountPanel() {
  const [state, setState] = useState<PanelState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getMe();
        if (!cancelled) {
          setState({ status: 'user', user: result.data });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiError && error.status === 401) {
          setState({ status: 'signedOut' });
        } else {
          setState({ status: 'error' });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
        <p className="text-[13px] leading-snug text-faint">Checking your session…</p>
      </div>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <div className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>You&apos;re not signed in</CardTitle>
          <CardDescription>Log in to see your Sellonit account.</CardDescription>
        </CardHeader>
        <Link className={buttonVariants()} href="/auth/login">
          Log in
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>We couldn&apos;t load your account</CardTitle>
          <CardDescription>
            Something went wrong. Check your connection and try again.
          </CardDescription>
        </CardHeader>
        <Link className={buttonVariants()} href="/auth/login">
          Log in
        </Link>
      </div>
    );
  }

  const { user } = state;
  return (
    <div className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>You&apos;re signed in</CardTitle>
        <CardDescription>Hi {user.firstName}, this is your Sellonit account.</CardDescription>
      </CardHeader>
      <ul className="flex flex-col gap-2.5 border-t border-border pt-4">
        <AccountRow label="Email" value={user.email} />
        <AccountRow
          label="Phone"
          value={user.phone ? formatPhoneDisplay(user.phone) : 'Not provided'}
        />
        <AccountRow
          label="Email verification"
          badge={user.emailVerifiedAt ? 'Verified' : 'Pending'}
          verified={Boolean(user.emailVerifiedAt)}
        />
        <AccountRow
          label="Phone verification"
          badge={user.phoneVerifiedAt ? 'Verified' : 'Pending'}
          verified={Boolean(user.phoneVerifiedAt)}
        />
      </ul>
      {!user.emailVerifiedAt ? (
        <p className="text-[13px] leading-snug text-faint">
          Check your inbox for the verification link — you&apos;ll need it before you can log in.
        </p>
      ) : null}
    </div>
  );
}

type AccountRowProps =
  | { label: string; value: string; badge?: undefined; verified?: undefined }
  | { label: string; value?: undefined; badge: string; verified: boolean };

function AccountRow(props: AccountRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{props.label}</span>
      {props.badge !== undefined ? (
        <span
          className={cn(
            'inline-block rounded-full px-2.5 py-0.5 text-xs leading-relaxed font-semibold',
            props.verified ? 'bg-success/10 text-success' : 'bg-[#f1efe9] text-faint',
          )}
        >
          {props.badge}
        </span>
      ) : (
        <span className="text-right font-semibold break-all">{props.value}</span>
      )}
    </li>
  );
}
