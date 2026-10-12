'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field } from './Field';
import { login } from '@/lib/auth/api';
import { authErrorMessage } from '@/lib/auth/errors';
import { isEmail } from '@/lib/auth/validation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitForm();
  }

  async function submitForm() {
    if (submitting) {
      return;
    }
    setServerError(null);
    const nextEmailError = isEmail(email) ? null : 'Enter a valid email address.';
    const nextPasswordError = password.length > 0 ? null : 'Enter your password.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) {
        document.getElementById('email')?.focus();
      } else {
        document.getElementById('password')?.focus();
      }
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // The API set the session cookie; follow the actual authenticated flow.
      router.replace('/account');
    } catch (error) {
      setSubmitting(false);
      setServerError(authErrorMessage(error));
    }
  }

  return (
    <div>
      <h1 className="card-title">Log in</h1>
      <p className="card-subtitle">Welcome back. Enter your email and password to continue.</p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <p className="alert alert-error" role="alert">
            {serverError}
          </p>
        ) : null}
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (emailError) {
              setEmailError(null);
            }
          }}
          error={emailError}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (passwordError) {
              setPasswordError(null);
            }
          }}
          error={passwordError}
          autoComplete="current-password"
          placeholder="Your password"
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Logging in…
            </>
          ) : (
            'Log in'
          )}
        </button>
      </form>
      <p className="card-footer">
        New to Sellonit?{' '}
        <Link className="link" href="/auth/register">
          Create your account
        </Link>
      </p>
    </div>
  );
}
