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
    <div className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Sell on Sellonit with your phone number. We&apos;ll text you a 6-digit code to verify it.
        </CardDescription>
      </CardHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
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
        <div className="grid grid-cols-1 gap-4 min-[381px]:grid-cols-2 min-[381px]:gap-3">
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
        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Creating your account…
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </form>
      <CardFooter>
        Already have an account?{' '}
        <Link
          className="font-semibold text-foreground underline underline-offset-2 hover:text-primary-hover"
          href="/auth/login"
        >
          Log in
        </Link>
      </CardFooter>
    </div>
  );
}
