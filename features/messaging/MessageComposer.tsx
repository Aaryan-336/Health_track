'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BackgroundPicker } from '@/components/messages/BackgroundPicker';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiError, post } from '@/lib/client/api';
import { resolveBackground } from '@/lib/backgrounds';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type MessageType = 'NOTE' | 'ENCOURAGEMENT' | 'THINKING_OF_YOU' | 'CELEBRATION' | 'REMINDER';

const TYPES: { value: MessageType; label: string; emoji: string }[] = [
  { value: 'NOTE', label: 'Just a note', emoji: '💌' },
  { value: 'THINKING_OF_YOU', label: 'Thinking of you', emoji: '🌸' },
  { value: 'ENCOURAGEMENT', label: 'Encouragement', emoji: '🌱' },
  { value: 'CELEBRATION', label: 'Celebrating you', emoji: '🎉' },
  { value: 'REMINDER', label: 'A reminder', emoji: '⏰' },
];

const STARTERS = [
  'Thinking about you today.',
  'Proud of you — I noticed.',
  'Dinner is handled tonight. Just come home.',
  'Hope today is being kind to you.',
  'No reason. Just wanted to say it.',
];

export function MessageComposer({ partnerName }: { partnerName: string }) {
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('NOTE');
  const [background, setBackground] = useState('sunrise');
  const [mode, setMode] = useState<'now' | 'later'>('now');
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const bg = resolveBackground(background);
  const firstName = partnerName.split(' ')[0];

  const send = async () => {
    if (!body.trim()) return;
    if (mode === 'later' && !when) {
      toast('Pick a time to send it', 'info', '⏰');
      return;
    }

    setBusy(true);
    try {
      await post('/messages', {
        body: body.trim(),
        messageType,
        background,
        scheduledFor: mode === 'later' ? new Date(when).toISOString() : null,
      });
      toast(mode === 'later' ? 'Scheduled — it will arrive on time' : 'Sent 💌', 'success', '💌');
      router.push('/us/messages');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not send that.', 'error');
      setBusy(false);
    }
  };

  // Local datetime string for the min attribute, five minutes from now.
  const minWhen = new Date(Date.now() + 5 * 60000 - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div>
      <PageHeader title={`A note for ${firstName}`} subtitle="It never has to be profound." />

      {/* Live preview of how it will land */}
      <motion.div
        layout
        className="mb-5 overflow-hidden rounded-card p-6 shadow-lift"
        style={{ background: bg.gradient, color: bg.ink }}
      >
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] opacity-60">
          How it will arrive
        </p>
        <p
          className={cn(
            'mt-3 font-display text-[1.45rem] leading-snug transition-opacity',
            !body.trim() && 'opacity-40',
          )}
        >
          {body.trim() || 'Your words will appear here…'}
        </p>
        <p className="mt-4 text-[0.78rem] opacity-55">
          {TYPES.find((t) => t.value === messageType)?.emoji} {bg.label}
        </p>
      </motion.div>

      <div className="space-y-5">
        <Field label="What do you want to say?">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Something small for ${firstName}…`}
            maxLength={2000}
            className="min-h-[7rem]"
            autoFocus
          />
        </Field>

        <div>
          <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
            Need a starter?
          </p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBody(s)}
                className="shrink-0 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left text-[0.82rem] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
            What kind of note
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setMessageType(t.value)}
                aria-pressed={messageType === t.value}
                aria-label={t.label}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-2xl border-2 py-2.5 transition-colors',
                  messageType === t.value
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-surface hover:border-accent/30',
                )}
              >
                <span className="text-lg" aria-hidden>
                  {t.emoji}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[0.82rem] font-bold">
            {TYPES.find((t) => t.value === messageType)?.label}
          </p>
        </div>

        <BackgroundPicker value={background} onChange={setBackground} />

        <div>
          <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
            When should it arrive?
          </p>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'now', label: 'Right now' },
              { value: 'later', label: 'Schedule it' },
            ]}
          />
          {mode === 'later' && (
            <div className="mt-3">
              <Input
                type="datetime-local"
                value={when}
                min={minWhen}
                onChange={(e) => setWhen(e.target.value)}
              />
              <p className="mt-1.5 text-[0.8rem] text-faint">
                {firstName} will get a notification when it lands.
              </p>
            </div>
          )}
        </div>

        <Button fullWidth size="lg" onClick={send} loading={busy} disabled={!body.trim()}>
          {mode === 'later' ? 'Schedule it' : `Send to ${firstName}`}
        </Button>
      </div>
    </div>
  );
}
