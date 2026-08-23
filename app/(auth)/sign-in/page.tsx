import Link from 'next/link';
import type { Metadata } from 'next';

import { SignInForm } from '@/features/auth/SignInForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-blob bg-blush-soft text-3xl shadow-soft">
          🌸
        </div>
        <h1 className="font-display text-[2.1rem] leading-tight tracking-[-0.03em]">
          Welcome back
        </h1>
        <p className="mt-2 text-[0.94rem] text-muted">Good to see you again.</p>
      </div>

      <SignInForm />

      <p className="mt-6 text-center text-[0.88rem] text-muted">
        New here?{' '}
        <Link href="/sign-up" className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
