'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Field } from './Field';
import { register } from '@/lib/auth/api';
import { ApiError } from '@/lib/api-client';
import { authErrorMessage } from '@/lib/auth/errors';
import {
  formatPhoneDisplay,
  isEmail,
  isName,
  isNigerianPhoneDigits,
  isPassword,
  onlyDigits,
  toLocalPhone,
} from '@/lib/auth/validation';

type FieldErrors = {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
};

const FIELD_ORDER: Array<keyof FieldErrors> = [
  'phone',
  'firstName',
  'lastName',
  'email',
  'password',
];

export function CreateAccountForm() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearFieldError(field: keyof FieldErrors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!isNigerianPhoneDigits(phone)) {
      next.phone = 'Enter your 10-digit phone number, e.g. 803 123 4567.';
    }
    if (!isName(firstName)) {
      next.firstName = 'Enter your first name.';
    }
    if (!isName(lastName)) {
      next.lastName = 'Enter your last name.';
    }
    if (!isEmail(email)) {
      next.email = 'Enter a valid email address.';
    }
    if (!isPassword(password)) {
      next.password = 'Use at least 8 characters.';
    }
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitForm();
  }

  async function submitForm() {
    if (submitting) {
      return;
    }
    setServerError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const firstInvalid = FIELD_ORDER.find((field) => next[field]);
      if (firstInvalid) {
        document.getElementById(firstInvalid)?.focus();
      }
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: toLocalPhone(phone),
      });
      // Advance only because the backend confirmed the account was created
      // and the SMS code was sent. The phone number is preserved for the
      // verification screen.
      router.replace(`/auth/verify?phone=${encodeURIComponent(toLocalPhone(phone))}`);
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.code === 'INVALID_PHONE') {
        setErrors((prev) => ({ ...prev, phone: 'Enter a valid Nigerian phone number.' }));
      } else {
        setServerError(authErrorMessage(error));
      }
    }
  }

  const phoneDisplay = isNigerianPhoneDigits(phone)
    ? formatPhoneDisplay(toLocalPhone(phone))
    : null;

  return (
    <div>
      <h1 className="card-title">Create your account</h1>
      <p className="card-subtitle">
        Sell on Sellonit with your phone number. We&apos;ll text you a 6-digit code to verify it.
      </p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <p className="alert alert-error" role="alert">
            {serverError}
          </p>
        ) : null}
        <Field
          id="phone"
          label="Phone number"
          prefix="+234"
          value={phone}
          onChange={(value) => {
            setPhone(onlyDigits(value, 10));
            clearFieldError('phone');
          }}
          error={errors.phone}
          helper={
            phoneDisplay
              ? `We’ll send a 6-digit code to ${phoneDisplay}.`
              : 'We’ll send a 6-digit code to this number.'
          }
          inputMode="numeric"
          autoComplete="tel"
          placeholder="803 123 4567"
          maxLength={10}
        />
        <div className="field-row">
          <Field
            id="firstName"
            label="First name"
            value={firstName}
            onChange={(value) => {
              setFirstName(value);
              clearFieldError('firstName');
            }}
            error={errors.firstName}
            autoComplete="given-name"
            placeholder="Ada"
            maxLength={80}
          />
          <Field
            id="lastName"
            label="Last name"
            value={lastName}
            onChange={(value) => {
              setLastName(value);
              clearFieldError('lastName');
            }}
            error={errors.lastName}
            autoComplete="family-name"
            placeholder="Eze"
            maxLength={80}
          />
        </div>
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            clearFieldError('email');
          }}
          error={errors.email}
          helper="We'll send a verification link to this address."
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
            clearFieldError('password');
          }}
          error={errors.password}
          helper="At least 8 characters."
          autoComplete="new-password"
          placeholder="Create a password"
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
              Creating your account…
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>
      <p className="card-footer">
        Already have an account?{' '}
        <Link className="link" href="/auth/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
