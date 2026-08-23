'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Toggle } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, api, patch, post } from '@/lib/client/api';
import { currentPushState, disablePush, enablePush, type PushState } from '@/lib/client/push';
import { useUI } from '@/stores/ui';

type Preference = {
  category: string;
  label: string;
  description: string;
  enabled: boolean;
  quietStart: string | null;
  quietEnd: string | null;
};

type Reminder = {
  id: string;
  type: string;
  scheduledFor: string;
  title: string;
  body: string;
};

const REMINDER_TYPES: { value: string; label: string; emoji: string; title: string; body: string }[] = [
  { value: 'WATER_REMINDER', label: 'Water', emoji: '💧', title: 'Water break', body: 'A glass now keeps the day easy.' },
  { value: 'MEAL_REMINDER', label: 'Meals', emoji: '🍽️', title: 'Eat something good', body: 'Have you had a proper meal?' },
  { value: 'WORKOUT_REMINDER', label: 'Movement', emoji: '🏃', title: 'Time to move', body: 'Even ten minutes counts.' },
  { value: 'HABIT_REMINDER', label: 'Habits', emoji: '🌱', title: 'Your habits', body: 'A quick tick before the day gets away.' },
  { value: 'GOAL_REMINDER', label: 'Goals', emoji: '🎯', title: 'Your goals', body: 'A small step towards what you set.' },
  { value: 'DAILY_CHECK_IN', label: 'Check-in', emoji: '💞', title: 'Daily check-in', body: 'Say hello to each other.' },
  { value: 'HEALTH_REMINDER', label: 'Anything', emoji: '✨', title: 'A nudge', body: 'This is your reminder.' },
];

const timeOf = (isoInstant: string) =>
  new Date(isoInstant).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function NotificationsScreen({
  configured,
  vapidPublicKey,
  devices,
  timezone,
  preferences,
  reminders,
}: {
  configured: boolean;
  vapidPublicKey: string;
  devices: number;
  timezone: string;
  preferences: Preference[];
  reminders: Reminder[];
}) {
  const [prefs, setPrefs] = useState(preferences);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  // Quiet hours are shown once and written to every category — a single window
  // is what people actually mean by "don't wake me up".
  const [quietStart, setQuietStart] = useState(preferences[0]?.quietStart ?? '22:00');
  const [quietEnd, setQuietEnd] = useState(preferences[0]?.quietEnd ?? '07:30');
  const [quietOn, setQuietOn] = useState(Boolean(preferences[0]?.quietStart));

  const [type, setType] = useState(REMINDER_TYPES[0]!.value);
  const [title, setTitle] = useState(REMINDER_TYPES[0]!.title);
  const [body, setBody] = useState(REMINDER_TYPES[0]!.body);
  const [time, setTime] = useState('09:00');

  const router = useRouter();
  const toast = useUI((s) => s.toast);

  useEffect(() => {
    void currentPushState().then(setPushState);
  }, []);

  const subscribed = pushState === 'subscribed';

  const togglePush = async () => {
    setBusy(true);
    try {
      const next = subscribed ? await disablePush() : await enablePush(vapidPublicKey);
      setPushState(next);
      if (next === 'subscribed') toast('Notifications on for this device', 'success', '🔔');
      else if (next === 'denied') toast('Your browser is blocking notifications.', 'error');
      else if (subscribed) toast('Turned off for this device', 'info');
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not change that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      await post('/notifications/test');
      toast('Sent — watch for it', 'success', '🌸');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not send that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveCategory = async (next: Preference) => {
    const previous = prefs;
    setPrefs((current) => current.map((p) => (p.category === next.category ? next : p)));
    try {
      await patch('/notifications/preferences', {
        updates: [
          {
            category: next.category,
            enabled: next.enabled,
            quietStart: next.quietStart,
            quietEnd: next.quietEnd,
          },
        ],
      });
    } catch (error) {
      setPrefs(previous);
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    }
  };

  const saveQuietHours = async (on: boolean, start: string, end: string) => {
    setQuietOn(on);
    const next = prefs.map((p) => ({
      ...p,
      quietStart: on ? start : null,
      quietEnd: on ? end : null,
    }));
    const previous = prefs;
    setPrefs(next);
    try {
      await patch('/notifications/preferences', {
        updates: next.map((p) => ({
          category: p.category,
          enabled: p.enabled,
          quietStart: p.quietStart,
          quietEnd: p.quietEnd,
        })),
      });
    } catch (error) {
      setPrefs(previous);
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    }
  };

  const addReminder = async () => {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await post('/notifications/reminders', {
        notificationType: type,
        title: title.trim(),
        body: body.trim(),
        time,
      });
      setOpen(false);
      toast(`Set for ${time}`, 'success', '⏰');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not set that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeReminder = async (reminder: Reminder) => {
    setBusy(true);
    try {
      await api(`/notifications/reminders?id=${reminder.id}`, { method: 'DELETE' });
      toast('Reminder removed', 'info');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not remove that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const chooseType = (value: string) => {
    const preset = REMINDER_TYPES.find((r) => r.value === value)!;
    setType(value);
    setTitle(preset.title);
    setBody(preset.body);
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Nudges arrive only where you have turned them on, and never during quiet hours."
      />

      {/* ── This device ──────────────────────────────────────────────────── */}
      <Card tone={subscribed ? 'sage' : 'plain'} className="mb-6">
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="text-2xl">
            {subscribed ? '🔔' : '🔕'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.2rem] leading-tight">
              {subscribed ? 'On for this device' : 'Off for this device'}
            </p>
            <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">
              {!configured
                ? 'Push is not configured on this server yet.'
                : pushState === 'unsupported'
                  ? 'This browser cannot receive push notifications. On iPhone, add Bloom to your home screen first.'
                  : pushState === 'denied'
                    ? 'Your browser is blocking notifications for Bloom. Allow them in site settings, then come back.'
                    : subscribed
                      ? `Signed in on ${devices} ${devices === 1 ? 'device' : 'devices'}.`
                      : 'Turn this on to get notes from your partner and your own reminders.'}
            </p>

            {/* Only rendered once the browser has answered, so the server and
                client agree on the first paint. */}
            {configured && pushState !== null && pushState !== 'unsupported' && pushState !== 'denied' && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant={subscribed ? 'outline' : 'primary'} loading={busy} onClick={togglePush}>
                  {subscribed ? 'Turn off here' : 'Turn on'}
                </Button>
                {subscribed && (
                  <Button size="sm" variant="soft" disabled={busy} onClick={sendTest}>
                    Send a test
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-2.5 px-1 font-display text-[1.25rem]">What you hear about</h2>
        <div className="space-y-2.5">
          {prefs.map((p) => (
            <Card key={p.category} className="px-3 py-2.5">
              <Toggle
                checked={p.enabled}
                onChange={(enabled) => saveCategory({ ...p, enabled })}
                label={p.label}
                description={p.description}
              />
            </Card>
          ))}
        </div>
      </section>

      {/* ── Quiet hours ──────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-2.5 px-1 font-display text-[1.25rem]">Quiet hours</h2>
        <Card className="px-3 py-2.5">
          <Toggle
            checked={quietOn}
            onChange={(on) => saveQuietHours(on, quietStart, quietEnd)}
            label="Hold everything overnight"
            description={`Anything that arrives in the window waits until morning. Times are in ${timezone.replace('_', ' ')}.`}
          />

          <AnimatePresence initial={false}>
            {quietOn && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 px-3 pb-2 pt-2">
                  <Field label="From">
                    <Input
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                      onBlur={() => saveQuietHours(true, quietStart, quietEnd)}
                    />
                  </Field>
                  <Field label="Until">
                    <Input
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                      onBlur={() => saveQuietHours(true, quietStart, quietEnd)}
                    />
                  </Field>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </section>

      {/* ── Reminders ────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
          <h2 className="font-display text-[1.25rem]">Your reminders</h2>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[0.86rem] font-bold text-accent-ink"
          >
            Add one
          </button>
        </div>

        {reminders.length === 0 ? (
          <Empty
            emoji="⏰"
            title="No reminders set"
            body="Pick a time and Bloom will nudge you then, every day, in your own time zone."
            action={<Button onClick={() => setOpen(true)}>Set one</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {reminders.map((r) => (
              <Card key={r.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="numeral shrink-0 rounded-2xl bg-raised px-3 py-2 text-[0.95rem] font-bold">
                  {timeOf(r.scheduledFor)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold leading-snug">{r.title}</p>
                  <p className="truncate text-[0.84rem] text-muted">{r.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeReminder(r)}
                  disabled={busy}
                  aria-label={`Remove the ${r.title} reminder`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A daily reminder"
        footer={
          <Button fullWidth size="lg" onClick={addReminder} loading={busy} disabled={!title.trim()}>
            Set it
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {REMINDER_TYPES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => chooseType(r.value)}
                aria-pressed={type === r.value}
                className={`inline-flex items-center gap-1.5 rounded-pill border-2 px-3 py-2 text-[0.82rem] font-bold transition-colors ${
                  type === r.value ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
                }`}
              >
                <span aria-hidden>{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>

          <Field label="Time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>

          <Field label="What should it say?">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </Field>

          <Field label="And underneath">
            <Input value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} />
          </Field>

          {!subscribed && (
            <div className="rounded-2xl bg-honey-soft px-4 py-3 text-[0.85rem] leading-relaxed">
              <Pill tone="honey">Heads up</Pill>
              <p className="mt-2">
                Notifications are off for this device, so this will be saved but stay quiet until you
                turn them on above.
              </p>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
