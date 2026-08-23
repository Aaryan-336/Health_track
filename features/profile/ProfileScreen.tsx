'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { ModeToggle } from '@/components/layout/ModeToggle';
import { Sheet } from '@/components/ui/Sheet';
import { signOutAction } from '@/features/auth/actions';
import { ApiError, patch } from '@/lib/client/api';
import { COMMON_TIMEZONES } from '@/lib/dates';
import { useUI } from '@/stores/ui';

type Props = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  timezone: string;
  streak: number;
  longestStreak: number;
  daysHere: number;
  sharedCategories: number;
  notificationsOn: number;
  devices: number;
  partnerName: string | null;
  coupleStatus: string | null;
};

export function ProfileScreen(props: Props) {
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(props.displayName);
  const [timezone, setTimezone] = useState(props.timezone);

  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const zones = COMMON_TIMEZONES.includes(props.timezone)
    ? COMMON_TIMEZONES
    : [props.timezone, ...COMMON_TIMEZONES];

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await patch('/profile', { displayName: name.trim(), timezone });
      setEdit(false);
      toast('Saved', 'success', '✨');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.86rem] font-bold text-muted">Your corner</p>
          <h1 className="mt-0.5 truncate font-display text-[2.1rem] leading-[1.1] tracking-[-0.035em]">
            {props.displayName.split(' ')[0]}
          </h1>
        </div>
        <ModeToggle />
      </header>

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card tone="accent">
          <div className="flex items-center gap-4">
            <Avatar name={props.displayName} src={props.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[1.35rem] leading-tight">
                {props.displayName}
              </p>
              <p className="truncate text-[0.86rem] text-muted">{props.email}</p>
              <p className="mt-1 text-[0.8rem] text-faint">{props.timezone.replace('_', ' ')}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
              Edit
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <Stat emoji="🔥" value={props.streak} label="day streak" />
            <Stat emoji="🏅" value={props.longestStreak} label="your best" />
            <Stat emoji="🌱" value={props.daysHere} label="days here" />
          </div>
        </Card>
      </motion.div>

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <div className="mt-6 space-y-2.5">
        <Row
          href="/profile/privacy"
          emoji="🔒"
          title="Privacy & sharing"
          detail={
            props.sharedCategories === 0
              ? 'Everything private'
              : `${props.sharedCategories} ${props.sharedCategories === 1 ? 'thing' : 'things'} shared`
          }
        />
        <Row
          href="/profile/notifications"
          emoji="🔔"
          title="Notifications"
          detail={
            props.devices === 0
              ? 'Not on for this device'
              : `${props.notificationsOn} categories · ${props.devices} ${props.devices === 1 ? 'device' : 'devices'}`
          }
        />
        <Row href="/profile/appearance" emoji="🎨" title="Look & feel" detail="Colour and light" />
        <Row href="/profile/targets" emoji="🎯" title="Daily targets" detail="Water, food, movement" />
        <Row
          href="/us"
          emoji="💞"
          title="Together"
          detail={
            props.partnerName
              ? `With ${props.partnerName.split(' ')[0]}`
              : props.coupleStatus === 'PENDING'
                ? 'Invite waiting'
                : 'Not connected yet'
          }
        />
      </div>

      {/* ── Sign out ─────────────────────────────────────────────────────── */}
      <form action={signOutAction} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-pill border border-line bg-surface py-3.5 text-[0.95rem] font-bold text-muted transition-colors hover:border-clay/40 hover:text-ink"
        >
          Sign out
        </button>
      </form>

      <p className="mt-6 px-6 text-center text-[0.78rem] leading-relaxed text-faint">
        Bloom keeps your health data to yourself unless you say otherwise. Nothing here is medical
        advice.
      </p>

      {/* ── Edit sheet ───────────────────────────────────────────────────── */}
      <Sheet
        open={edit}
        onClose={() => setEdit(false)}
        title="About you"
        footer={
          <Button fullWidth size="lg" onClick={save} loading={busy} disabled={!name.trim()}>
            Save
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Your name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>

          <Field
            label="Time zone"
            hint="Days, streaks and reminders all follow this."
          >
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ emoji, value, label }: { emoji: string; value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-surface/70 px-4 py-3">
      <p className="text-[1.1rem]" aria-hidden>
        {emoji}
      </p>
      <p className="numeral mt-0.5 text-[1.5rem] font-bold leading-none">{value}</p>
      <p className="mt-1 text-[0.78rem] text-muted">{label}</p>
    </div>
  );
}

function Row({
  href,
  emoji,
  title,
  detail,
}: {
  href: string;
  emoji: string;
  title: string;
  detail: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:border-accent/40">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-raised text-lg">
          {emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">{title}</span>
          <span className="mt-0.5 block truncate text-[0.84rem] text-muted">{detail}</span>
        </span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-faint" aria-hidden>
          <path d="M7.5 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Card>
    </Link>
  );
}
