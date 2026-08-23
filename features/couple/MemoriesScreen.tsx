'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, api, del } from '@/lib/client/api';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Memory = {
  id: string;
  caption: string | null;
  memoryDate: string;
  creatorName: string;
  mine: boolean;
  media: { id: string }[];
};

const MAX_PHOTOS = 4;

const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const monthLabel = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const dayLabel = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/** Groups the timeline by month, newest first — the list arrives sorted. */
function groupByMonth(memories: Memory[]) {
  const groups: { key: string; memories: Memory[] }[] = [];
  for (const memory of memories) {
    const key = monthLabel(memory.memoryDate);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.memories.push(memory);
    else groups.push({ key, memories: [memory] });
  }
  return groups;
}

export function MemoriesScreen({ memories }: { memories: Memory[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [date, setDate] = useState(todayLocal);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Memory | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const groups = groupByMonth(memories);

  // Object URLs are revoked together whenever the selection changes.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const choose = (list: FileList | null) => {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)].slice(0, MAX_PHOTOS));
    if (fileInput.current) fileInput.current.value = '';
  };

  const save = async () => {
    if (!caption.trim() && files.length === 0) return;
    setBusy(true);
    try {
      const form = new FormData();
      if (caption.trim()) form.set('caption', caption.trim());
      form.set('memoryDate', new Date(`${date}T12:00:00`).toISOString());
      for (const file of files) form.append('photos', file);

      await api('/memories', { method: 'POST', body: form });

      setOpen(false);
      setCaption('');
      setFiles([]);
      setDate(todayLocal());
      toast('Kept forever 📸', 'success', '📸');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await del(`/memories/${pendingDelete.id}`);
      setPendingDelete(null);
      toast('Removed', 'info');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not remove that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Memories"
        subtitle="The small days worth keeping. Only the two of you can see these."
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Add a memory"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      {memories.length === 0 ? (
        <Empty
          emoji="📸"
          title="Nothing kept yet"
          body="Add a photo or just a line about a day you don't want to forget."
          action={<Button onClick={() => setOpen(true)}>Add the first one</Button>}
        />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 px-1 font-display text-[1.25rem]">{group.key}</h2>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {group.memories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      onDelete={() => setPendingDelete(memory)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Add ─────────────────────────────────────────────────────────── */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A memory"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={save}
            loading={busy}
            disabled={!caption.trim() && files.length === 0}
          >
            Keep it
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="When was it?">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Field label="What happened?" hint="A caption, or the whole story — up to you.">
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Rained the whole walk and neither of us minded."
              maxLength={400}
              className="min-h-[6rem]"
            />
          </Field>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Photos ({files.length}/{MAX_PHOTOS})
            </p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative h-20 w-20 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((c) => c.filter((_, index) => index !== i))}
                    aria-label="Remove this photo"
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/60 text-xs font-bold text-white"
                  >
                    ×
                  </button>
                </div>
              ))}

              {files.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-dashed border-line text-2xl text-muted transition-colors hover:border-accent/50"
                  aria-label="Choose photos"
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              hidden
              onChange={(e) => choose(e.target.files)}
            />
            <p className="mt-2 text-[0.82rem] text-faint">
              Up to {MAX_PHOTOS} images, 8 MB each. They are stored privately and only ever served
              to the two of you.
            </p>
          </div>
        </div>
      </Sheet>

      {/* ── Confirm removal ─────────────────────────────────────────────── */}
      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Remove this memory?"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={remove}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-[0.92rem] leading-relaxed text-muted">
          It disappears from the timeline for both of you, along with any photos.
        </p>
      </Sheet>
    </div>
  );
}

function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: () => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const count = memory.media.length;

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card padded={false} className="overflow-hidden">
          {count > 0 && (
            <div
              className={cn(
                'grid gap-0.5',
                count === 1 && 'grid-cols-1',
                count === 2 && 'grid-cols-2',
                count >= 3 && 'grid-cols-2',
              )}
            >
              {memory.media.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setLightbox(image.id)}
                  className={cn(
                    'relative overflow-hidden bg-raised',
                    count === 1 ? 'aspect-[4/3]' : 'aspect-square',
                    count === 3 && i === 0 && 'row-span-2 aspect-auto',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/media/${image.id}`}
                    alt={memory.caption ?? 'A memory'}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-muted">
                  {dayLabel(memory.memoryDate)}
                </p>
                {memory.caption && (
                  <p className="mt-2 font-display text-[1.15rem] leading-snug">{memory.caption}</p>
                )}
                <p className="mt-2 text-[0.82rem] text-faint">
                  Kept by {memory.mine ? 'you' : memory.creatorName.split(' ')[0]}
                </p>
              </div>

              {memory.mine && (
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label="Remove this memory"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
                    <path
                      d="M4 6h12M8 6V4.5h4V6M6.5 6l.7 9h5.6l.7-9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              src={`/api/v1/media/${lightbox}`}
              alt={memory.caption ?? 'A memory'}
              className="max-h-[85dvh] max-w-full rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
