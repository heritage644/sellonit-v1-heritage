'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Field } from './Field';
import { Button, buttonVariants } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { verifyPhone } from '@/lib/auth/api';
import { authErrorMessage } from '@/lib/auth/errors';
import { formatPhoneDisplay, isVerificationCode, onlyDigits } from '@/lib/auth/validation';

type VerifyPhoneFormProps = {
  /** Phone number the user registered with (local `0XXXXXXXXXX` form). */
  phone: string | null;
};

const PHONE_PATTERN = /^(0\d{10}|\+234\d{10})$/;

const linkClass =
  'font-semibold text-foreground underline underline-offset-2 hover:text-primary-hover';

export function VerifyPhoneForm({ phone }: VerifyPhoneFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);

  const validPhone = phone !== null && PHONE_PATTERN.test(phone);

  if (!validPhone) {
    return (
      <div className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Verify your phone number</CardTitle>
          <CardDescription>
            Enter your phone number first and we&apos;ll send you a 6-digit verification code.
          </CardDescription>
        </CardHeader>
        <Link className={buttonVariants()} href="/auth/register">
          Enter your phone number
        </Link>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitForm();
  }

  async function submitForm() {
    if (submitting) {
      return;
    }
    if (!isVerificationCode(code)) {
      setError('Enter the 6-digit code from the text message.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyPhone(code);
      setSubmitting(false);
      if (result.data.verified) {
        setVerified(true);
      } else {
        setError('That code is not correct. Check the text message and try again.');
      }
    } catch (err) {
      setSubmitting(false);
      setError(authErrorMessage(err));
    }
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <span
          className="flex size-13 items-center justify-center rounded-full bg-success/10 text-success"
          aria-hidden="true"
        >
          <CheckCircle2 className="size-6" strokeWidth={2.5} />
        </span>
        <CardHeader className="items-center">
          <CardTitle>Phone number verified</CardTitle>
          <CardDescription>
            Your number is verified. Check your email inbox and click the verification link to
            finish setting up your account, then log in to continue.
          </CardDescription>
        </CardHeader>
        <div className="flex w-full flex-col items-center gap-4">
          <Link className={buttonVariants()} href="/auth/login">
            Log in
          </Link>
          <Link className={linkClass} href="/auth/register">
            Use a different number
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Verify your phone number</CardTitle>
        <CardDescription>
          We sent a 6-digit code to{' '}
          <strong className="text-foreground">{formatPhoneDisplay(phone)}</strong>. Enter it below
          to verify your number.
        </CardDescription>
      </CardHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Field
          id="code"
          label="Verification code"
          value={code}
          onChange={(value) => {
            setCode(onlyDigits(value, 6));
            if (error) {
              setError(null);
            }
          }}
          error={error}
          inputClassName="h-12 text-center text-xl font-semibold tracking-[0.45em] indent-[0.45em] tabular-nums"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
        />
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            'Verify code'
          )}
        </Button>
        <p className="text-center text-[13px] leading-snug text-faint">
          Didn&apos;t get a code? It expires 10 minutes after it&apos;s sent.
        </p>
      </form>
    </div>
  );
}
