import Link from 'next/link';
import type { Metadata } from 'next';

import { SignUpForm } from '@/features/auth/SignUpForm';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <div>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-blob bg-honey-soft text-3xl shadow-soft">
          🌱
        </div>
        <h1 className="font-display text-[2.1rem] leading-tight tracking-[-0.03em]">
          Let&rsquo;s begin
        </h1>
        <p className="mt-2 text-[0.94rem] text-muted">A few details and you&rsquo;re in.</p>
      </div>

      <SignUpForm />

      <p className="mt-6 text-center text-[0.88rem] text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-bold text-ink underline decoration-accent decoration-2 underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
