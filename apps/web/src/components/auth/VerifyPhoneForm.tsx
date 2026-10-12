'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { Field } from './Field';
import { verifyPhone } from '@/lib/auth/api';
import { authErrorMessage } from '@/lib/auth/errors';
import { formatPhoneDisplay, isVerificationCode, onlyDigits } from '@/lib/auth/validation';

type VerifyPhoneFormProps = {
  /** Phone number the user registered with (local `0XXXXXXXXXX` form). */
  phone: string | null;
};

const PHONE_PATTERN = /^(0\d{10}|\+234\d{10})$/;

export function VerifyPhoneForm({ phone }: VerifyPhoneFormProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);

  const validPhone = phone !== null && PHONE_PATTERN.test(phone);

  if (!validPhone) {
    return (
      <div>
        <h1 className="card-title">Verify your phone number</h1>
        <p className="card-subtitle">
          Enter your phone number first and we&apos;ll send you a 6-digit verification code.
        </p>
        <Link className="btn btn-primary" href="/auth/register">
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
      <div className="success-panel">
        <span className="success-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <h1 className="card-title">Phone number verified</h1>
        <p className="card-subtitle success-copy">
          Your number is verified. Check your email inbox and click the verification link to finish
          setting up your account, then log in to continue.
        </p>
        <Link className="btn btn-primary" href="/auth/login">
          Log in
        </Link>
        <Link className="link" href="/auth/register">
          Use a different number
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="card-title">Verify your phone number</h1>
      <p className="card-subtitle">
        We sent a 6-digit code to <strong>{formatPhoneDisplay(phone)}</strong>. Enter it below to
        verify your number.
      </p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
          inputClassName="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
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
              Verifying…
            </>
          ) : (
            'Verify code'
          )}
        </button>
        <p className="field-helper verify-note">
          Didn&apos;t get a code? It expires 10 minutes after it&apos;s sent.
        </p>
      </form>
    </div>
  );
}
