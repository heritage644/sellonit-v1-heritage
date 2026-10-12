'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      <div className="loading-panel">
        <span className="spinner" aria-hidden="true" />
        <p className="field-helper">Checking your session…</p>
      </div>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <div>
        <h1 className="card-title">You&apos;re not signed in</h1>
        <p className="card-subtitle">Log in to see your Sellonit account.</p>
        <Link className="btn btn-primary" href="/auth/login">
          Log in
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div>
        <h1 className="card-title">We couldn&apos;t load your account</h1>
        <p className="card-subtitle">Something went wrong. Check your connection and try again.</p>
        <Link className="btn btn-primary" href="/auth/login">
          Log in
        </Link>
      </div>
    );
  }

  const { user } = state;
  return (
    <div>
      <h1 className="card-title">You&apos;re signed in</h1>
      <p className="card-subtitle">Hi {user.firstName}, this is your Sellonit account.</p>
      <ul className="account-list">
        <li className="account-row">
          <span className="account-key">Email</span>
          <span className="account-value">{user.email}</span>
        </li>
        <li className="account-row">
          <span className="account-key">Phone</span>
          <span className="account-value">
            {user.phone ? formatPhoneDisplay(user.phone) : 'Not provided'}
          </span>
        </li>
        <li className="account-row">
          <span className="account-key">Email verification</span>
          <span className={user.emailVerifiedAt ? 'badge badge-verified' : 'badge badge-pending'}>
            {user.emailVerifiedAt ? 'Verified' : 'Pending'}
          </span>
        </li>
        <li className="account-row">
          <span className="account-key">Phone verification</span>
          <span className={user.phoneVerifiedAt ? 'badge badge-verified' : 'badge badge-pending'}>
            {user.phoneVerifiedAt ? 'Verified' : 'Pending'}
          </span>
        </li>
      </ul>
      {!user.emailVerifiedAt ? (
        <p className="field-helper">
          Check your inbox for the verification link — you&apos;ll need it before you can log in.
        </p>
      ) : null}
    </div>
  );
}
