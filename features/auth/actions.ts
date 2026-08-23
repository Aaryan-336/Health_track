'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

import { signIn, signOut } from '@/lib/auth';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/db/client';
import { safeTimezone } from '@/lib/dates';
import { ensureSharingDefaults } from '@/lib/permissions/sharing';
import { ensureNotificationDefaults } from '@/features/notifications/service';
import { signInSchema, signUpSchema } from '@/lib/validation/schemas';

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function zodToFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? '_');
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
    timezone: formData.get('timezone') || 'UTC',
  });

  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error.issues) };

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: 'There is already an account with that email.' } };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  // Account, health profile and privacy defaults land together — a user must
  // never exist without their private-by-default settings in place.
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        displayName: parsed.data.displayName,
        timezone: safeTimezone(parsed.data.timezone),
      },
    });
    await tx.healthProfile.create({ data: { userId: user.id } });
    return user;
  });

  const created = await prisma.user.findUniqueOrThrow({ where: { email } });
  await ensureSharingDefaults(created.id);
  await ensureNotificationDefaults(created.id);

  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: 'Account created — please sign in.' };
    throw error;
  }

  redirect('/onboarding');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { fieldErrors: zodToFieldErrors(parsed.error.issues) };

  try {
    await signIn('credentials', {
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'That email and password did not match.' };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.trim().toLowerCase() },
    select: { onboardedAt: true },
  });

  redirect(user?.onboardedAt ? '/home' : '/onboarding');
}

export async function signOutAction() {
  await signOut({ redirectTo: '/welcome' });
}
