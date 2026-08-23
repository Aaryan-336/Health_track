'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BlobBackdrop } from '@/components/ui/Blob';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { ApiError, post } from '@/lib/client/api';
import { useUI } from '@/stores/ui';

/** Shown on the Together tab until two people are actually connected. */
export function ConnectPanel({ inviteCode }: { inviteCode: string | null }) {
  const [code, setCode] = useState(inviteCode);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const createCode = async () => {
    setBusy(true);
    try {
      const res = await post<{ code: string }>('/couples/invite');
      setCode(res.code);
      toast('Invite code ready', 'success', '💞');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not create a code.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      await post('/couples/join', { code: joinCode.trim().toUpperCase() });
      toast('You are connected 💞', 'success', '💞');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'That code did not work.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast('Code copied', 'success', '📋');
    } catch {
      toast('Select the code to copy it', 'info');
    }
  };

  return (
    <div className="relative">
      <BlobBackdrop className="-z-10" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-6 text-center"
      >
        <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-blob bg-blush-soft text-5xl shadow-soft">
          💞
        </div>
        <h1 className="font-display text-[2.1rem] leading-[1.1] tracking-[-0.035em]">
          Better with two
        </h1>
        <p className="mx-auto mt-2.5 max-w-[20rem] text-[0.95rem] leading-relaxed text-muted">
          Connect with your partner to share goals, send little notes and cheer each other on.
        </p>
      </motion.div>

      <div className="mt-8 space-y-4">
        <Card>
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
            Invite your partner
          </p>

          {code ? (
            <>
              <p className="numeral mt-3 select-all text-center text-[2.6rem] tracking-[0.14em]">
                {code}
              </p>
              <p className="mt-1 text-center text-[0.82rem] text-muted">
                Share this code — it works for 3 days.
              </p>
              <Button variant="soft" fullWidth className="mt-3" onClick={copy}>
                Copy code
              </Button>
            </>
          ) : (
            <Button variant="soft" fullWidth className="mt-3" onClick={createCode} loading={busy}>
              Create an invite code
            </Button>
          )}
        </Card>

        <Card>
          <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
            Or enter their code
          </p>
          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={10}
              autoCapitalize="characters"
              className="text-center tracking-[0.2em]"
            />
            <Button onClick={join} loading={busy} disabled={joinCode.trim().length < 4}>
              Join
            </Button>
          </div>
        </Card>

        <p className="px-2 text-center text-[0.8rem] leading-relaxed text-faint">
          Connecting shares your couple space — goals, notes and memories. Your health data stays
          private until you choose to share it.
        </p>
      </div>
    </div>
  );
}
