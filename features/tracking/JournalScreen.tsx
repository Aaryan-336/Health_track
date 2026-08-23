'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Textarea, Toggle } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, del, patch, post } from '@/lib/client/api';
import { formatLocalDate } from '@/lib/dates';
import { useUI } from '@/stores/ui';

type Entry = {
  id: string;
  title: string | null;
  content: string;
  prompt: string | null;
  isShared: boolean;
  localDate: string;
  createdAt: string;
};

/** The prompt cards from the reference "Quick Journal" row. */
const PROMPTS = [
  { text: 'What made you smile today?', tone: 'blush' as const, tag: 'Gratitude' },
  { text: 'How do you want to feel tomorrow?', tone: 'lilac' as const, tag: 'Intention' },
  { text: 'What are you grateful for today?', tone: 'sage' as const, tag: 'Gratitude' },
  { text: 'What took more out of you than expected?', tone: 'clay' as const, tag: 'Reflection' },
  { text: 'One small thing that went well.', tone: 'honey' as const, tag: 'Small wins' },
];

export function JournalScreen({
  initial,
  partnerName,
}: {
  initial: Entry[];
  partnerName: string | null;
}) {
  const [entries, setEntries] = useState(initial);
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const startWith = (p: string | null) => {
    setPrompt(p);
    setTitle('');
    setContent('');
    setIsShared(false);
    setOpen(true);
  };

  const save = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      const entry = await post<Entry>('/journal', {
        title: title.trim() || undefined,
        content: content.trim(),
        prompt: prompt ?? undefined,
        isShared,
      });
      setEntries((prev) => [entry, ...prev]);
      setOpen(false);
      toast('Written down', 'success', '📖');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleShare = async (entry: Entry) => {
    const next = !entry.isShared;
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, isShared: next } : e)));
    setReading((r) => (r && r.id === entry.id ? { ...r, isShared: next } : r));
    try {
      await patch(`/journal/${entry.id}`, { isShared: next });
      toast(next ? 'Shared with your partner' : 'Back to private', 'info', next ? '💞' : '🔒');
    } catch (error) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, isShared: !next } : e)));
      toast(error instanceof ApiError ? error.message : 'Could not update that.', 'error');
    }
  };

  const remove = async (id: string) => {
    const before = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setReading(null);
    try {
      await del(`/journal/${id}`);
      toast('Entry deleted', 'info', '🗑️');
      router.refresh();
    } catch (error) {
      setEntries(before);
      toast(error instanceof ApiError ? error.message : 'Could not delete that.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="My journal"
        subtitle="Private by default. Always yours."
        action={
          <Button size="sm" onClick={() => startWith(null)}>
            Write
          </Button>
        }
      />

      <section className="mb-7">
        <h2 className="mb-2.5 px-1 font-display text-[1.3rem]">Quick journal</h2>
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
          {PROMPTS.map((p) => (
            <button
              key={p.text}
              type="button"
              onClick={() => startWith(p.text)}
              className="shrink-0 text-left"
            >
              <Card tone={p.tone} className="flex h-full w-[10.5rem] flex-col justify-between">
                <p className="font-bold leading-snug">{p.text}</p>
                <Pill className="mt-4 self-start bg-surface/70">{p.tag}</Pill>
              </Card>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 px-1 font-display text-[1.3rem]">Your entries</h2>

        {entries.length === 0 ? (
          <Empty
            emoji="📖"
            title="Nothing written yet"
            body="Start with a prompt above, or just write whatever is on your mind."
            action={<Button onClick={() => startWith(null)}>Write something</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {entries.map((e) => (
                <motion.button
                  key={e.id}
                  layout
                  type="button"
                  onClick={() => setReading(e)}
                  exit={{ opacity: 0, x: -20 }}
                  className="block w-full text-left"
                >
                  <Card className="transition-shadow hover:shadow-lift">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-[1.15rem] leading-tight">
                          {e.title || formatLocalDate(e.localDate, 'EEEE d MMMM')}
                        </p>
                        {e.prompt && (
                          <p className="mt-0.5 text-[0.76rem] italic text-faint">{e.prompt}</p>
                        )}
                      </div>
                      <span aria-hidden className="shrink-0 text-sm opacity-60">
                        {e.isShared ? '💞' : '🔒'}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[0.9rem] leading-relaxed text-muted">
                      {e.content}
                    </p>
                    <p className="mt-2.5 text-[0.74rem] font-bold uppercase tracking-wider text-faint">
                      {formatLocalDate(e.localDate, 'd MMM yyyy')}
                    </p>
                  </Card>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={prompt ? 'Reflect' : 'New entry'}
        footer={
          <Button fullWidth size="lg" onClick={save} loading={busy} disabled={!content.trim()}>
            Save entry
          </Button>
        }
      >
        <div className="space-y-4">
          {prompt && (
            <Card tone="honey" className="py-3">
              <p className="text-[0.94rem] font-bold leading-snug">{prompt}</p>
            </Card>
          )}

          <Field label="Title (optional)">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A quiet win"
              maxLength={120}
            />
          </Field>

          <Field label="Your words">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write as much or as little as you like…"
              maxLength={20000}
              className="min-h-[11rem]"
              autoFocus
            />
          </Field>

          <div className="rounded-2xl border border-line bg-raised p-1">
            <Toggle
              checked={isShared}
              onChange={setIsShared}
              disabled={!partnerName}
              label={partnerName ? `Share with ${partnerName}` : 'Share with your partner'}
              description={
                partnerName
                  ? 'Off by default. You can change this any time.'
                  : 'Connect with a partner to share entries.'
              }
            />
          </div>
        </div>
      </Sheet>

      {/* ── Reader ───────────────────────────────────────────────────────── */}
      <Sheet
        open={Boolean(reading)}
        onClose={() => setReading(null)}
        title={reading?.title || 'Entry'}
        footer={
          reading && (
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => remove(reading.id)} className="flex-1">
                Delete
              </Button>
              <Button variant="soft" onClick={() => toggleShare(reading)} className="flex-1">
                {reading.isShared ? 'Make private' : 'Share'}
              </Button>
            </div>
          )
        }
      >
        {reading && (
          <div>
            <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-wider text-faint">
              {formatLocalDate(reading.localDate, 'EEEE d MMMM yyyy')}
            </p>
            {reading.prompt && (
              <Card tone="honey" className="mb-4 py-3">
                <p className="text-[0.9rem] font-bold leading-snug">{reading.prompt}</p>
              </Card>
            )}
            <p className="whitespace-pre-wrap text-[1rem] leading-relaxed">{reading.content}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
