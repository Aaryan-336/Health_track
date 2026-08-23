'use client';

import { useActionState, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { signUpAction, type FormState } from './actions';

export function SignUpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, {});
  const [timezone, setTimezone] = useState('UTC');

  // The browser knows the user's timezone; we capture it so daily rollups and
  // streaks land on the right calendar day from the very first log.
  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    } catch {
      setTimezone('UTC');
    }
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="timezone" value={timezone} />

      <Field label="Your name" error={state.fieldErrors?.displayName}>
        <Input name="displayName" autoComplete="name" placeholder="Alex" required maxLength={60} />
      </Field>

      <Field label="Email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>

      <Field
        label="Password"
        error={state.fieldErrors?.password}
        hint="At least 8 characters."
      >
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      {state.error && (
        <p className="rounded-2xl bg-clay-soft px-4 py-3 text-[0.88rem] font-semibold">{state.error}</p>
      )}

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Create account
      </Button>
    </form>
  );
}
