'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Field } from './Field';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back. Enter your email and password to continue.</CardDescription>
      </CardHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
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
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Logging in…
            </>
          ) : (
            'Log in'
          )}
        </Button>
      </form>
      <CardFooter>
        New to Sellonit?{' '}
        <Link
          className="font-semibold text-foreground underline underline-offset-2 hover:text-primary-hover"
          href="/auth/register"
        >
          Create your account
        </Link>
      </CardFooter>
    </div>
  );
}
