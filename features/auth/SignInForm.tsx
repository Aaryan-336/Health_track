'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { signInAction, type FormState } from './actions';

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});

  return (
    <form action={action} className="space-y-4">
      <Field label="Email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>

      <Field label="Password" error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      {state.error && (
        <p className="rounded-2xl bg-clay-soft px-4 py-3 text-[0.88rem] font-semibold">{state.error}</p>
      )}

      <Button type="submit" size="lg" fullWidth loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
