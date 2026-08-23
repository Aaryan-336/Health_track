'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { THEME_SWATCHES, type ThemeName } from '@/components/layout/ThemeProvider';
import { patch, post } from '@/lib/client/api';
import { ApiError } from '@/lib/client/api';
import { completeOnboarding } from './completeOnboarding';

/**
 * Four short steps: who you are, your daily rhythm, your colour, your partner.
 * Each step saves as it goes, so nothing is lost if the flow is interrupted.
 */

type Step = 'name' | 'rhythm' | 'theme' | 'partner';
const ORDER: Step[] = ['name', 'rhythm', 'theme', 'partner'];

export function OnboardingFlow(props: {
  displayName: string;
  timezone: string;
  timezones: string[];
  waterGoalMl: number;
  glassSizeMl: number;
  activityGoal: number;
  theme: string;
  connected: boolean;
  partnerName: string | null;
  existingCode: string | null;
}) {
  const [step, setStep] = useState<Step>('name');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState(props.displayName);
  const [timezone, setTimezone] = useState(props.timezone);
  const [glasses, setGlasses] = useState(Math.round(props.waterGoalMl / props.glassSizeMl));
  const [activity, setActivity] = useState(props.activityGoal);
  const [theme, setTheme] = useState<ThemeName>(props.theme as ThemeName);

  const [code, setCode] = useState(props.existingCode);
  const [joinCode, setJoinCode] = useState('');
  const [connected, setConnected] = useState(props.connected);
  const [partnerName, setPartnerName] = useState(props.partnerName);

  const index = ORDER.indexOf(step);

  const applyTheme = (t: ThemeName) => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('bloom-theme', t);
    } catch {
      /* storage may be unavailable */
    }
  };

  const next = async () => {
    setError(null);
    setSaving(true);
    try {
      if (step === 'name') {
        await patch('/profile', { displayName: displayName.trim(), timezone });
        setStep('rhythm');
      } else if (step === 'rhythm') {
        await patch('/profile', {
          healthProfile: {
            dailyWaterGoalMl: glasses * props.glassSizeMl,
            dailyActivityGoal: activity,
          },
        });
        setStep('theme');
      } else if (step === 'theme') {
        await patch('/profile', { themePreference: theme.toUpperCase() });
        setStep('partner');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const createCode = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await post<{ code: string }>('/couples/invite');
      setCode(res.code);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create a code.');
    } finally {
      setSaving(false);
    }
  };

  const join = async () => {
    setError(null);
    setSaving(true);
    try {
      await post('/couples/join', { code: joinCode.trim().toUpperCase() });
      const current = await fetch('/api/v1/couples/current').then((r) => r.json());
      setPartnerName(current?.data?.partner?.displayName ?? 'your partner');
      setConnected(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code did not work.');
    } finally {
      setSaving(false);
    }
  };

  const finish = () => startTransition(() => void completeOnboarding());

  return (
    <div>
      <div className="mb-8 flex gap-1.5" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={4}>
        {ORDER.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-pill transition-colors duration-500 ${
              i <= index ? 'bg-accent' : 'bg-line'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          {step === 'name' && (
            <section>
              <h1 className="font-display text-[2rem] leading-tight tracking-[-0.03em]">
                What should we call you?
              </h1>
              <p className="mb-6 mt-2 text-[0.94rem] text-muted">
                This is the name your partner will see.
              </p>

              <div className="space-y-4">
                <Field label="Your name">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="Alex"
                  />
                </Field>

                <Field label="Your timezone" hint="Keeps your days and streaks on the right date.">
                  <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {[...new Set([timezone, ...props.timezones])].map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>
          )}

          {step === 'rhythm' && (
            <section>
              <h1 className="font-display text-[2rem] leading-tight tracking-[-0.03em]">
                Your daily rhythm
              </h1>
              <p className="mb-6 mt-2 text-[0.94rem] text-muted">
                Gentle targets, not rules. Change them whenever you like.
              </p>

              <div className="space-y-5">
                <Counter
                  label="Glasses of water a day"
                  value={glasses}
                  onChange={setGlasses}
                  min={2}
                  max={20}
                  suffix="glasses"
                  emoji="💧"
                />
                <Counter
                  label="Minutes of movement a day"
                  value={activity}
                  onChange={setActivity}
                  min={5}
                  max={180}
                  step={5}
                  suffix="min"
                  emoji="🏃"
                />
              </div>
            </section>
          )}

          {step === 'theme' && (
            <section>
              <h1 className="font-display text-[2rem] leading-tight tracking-[-0.03em]">
                Pick your colour
              </h1>
              <p className="mb-6 mt-2 text-[0.94rem] text-muted">
                It sets the mood of the whole app.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {THEME_SWATCHES.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => applyTheme(s.name)}
                    aria-pressed={theme === s.name}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all duration-200 ${
                      theme === s.name
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:border-accent/30'
                    }`}
                  >
                    <span
                      className="h-10 w-10 rounded-blob shadow-soft"
                      style={{ background: s.hex }}
                      aria-hidden
                    />
                    <span className="text-[0.78rem] font-bold">{s.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 'partner' && (
            <section>
              <h1 className="font-display text-[2rem] leading-tight tracking-[-0.03em]">
                {connected ? 'You’re connected' : 'Connect with your partner'}
              </h1>
              <p className="mb-6 mt-2 text-[0.94rem] text-muted">
                {connected
                  ? `You and ${partnerName} share a space now.`
                  : 'Share a code, or enter theirs. You can also do this later.'}
              </p>

              {connected ? (
                <div className="rounded-card border border-sage/30 bg-sage-soft p-6 text-center">
                  <span className="text-4xl" aria-hidden>
                    💞
                  </span>
                  <p className="mt-3 font-display text-[1.3rem]">{partnerName}</p>
                  <p className="mt-1 text-[0.88rem] text-muted">Your shared space is ready.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-card border border-line bg-surface p-5">
                    <p className="text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                      Invite them
                    </p>
                    {code ? (
                      <>
                        <p className="numeral mt-3 select-all text-center text-[2.4rem] tracking-[0.12em]">
                          {code}
                        </p>
                        <p className="mt-1 text-center text-[0.82rem] text-muted">
                          Share this code — it works for 3 days.
                        </p>
                      </>
                    ) : (
                      <Button
                        variant="soft"
                        fullWidth
                        className="mt-3"
                        onClick={createCode}
                        loading={saving}
                      >
                        Create an invite code
                      </Button>
                    )}
                  </div>

                  <div className="rounded-card border border-line bg-surface p-5">
                    <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                      Or enter their code
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        maxLength={10}
                        className="text-center tracking-[0.2em]"
                        autoCapitalize="characters"
                      />
                      <Button onClick={join} loading={saving} disabled={joinCode.length < 4}>
                        Join
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="mt-5 rounded-2xl bg-clay-soft px-4 py-3 text-[0.88rem] font-semibold">
          {error}
        </p>
      )}

      <div className="mt-8 flex gap-3">
        {index > 0 && (
          <Button variant="ghost" onClick={() => setStep(ORDER[index - 1]!)}>
            Back
          </Button>
        )}
        {step === 'partner' ? (
          <Button fullWidth size="lg" onClick={finish} loading={pending}>
            {connected ? 'Take me in' : 'I’ll do this later'}
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={next} loading={saving} disabled={!displayName.trim()}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  emoji,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  emoji: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="mb-3 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <RoundButton onClick={() => onChange(Math.max(min, value - step))} label={`Decrease ${label}`}>
          −
        </RoundButton>
        <div className="text-center">
          <span className="mr-1 text-xl" aria-hidden>
            {emoji}
          </span>
          <span className="numeral text-[2rem]">{value}</span>
          <span className="ml-1 text-[0.82rem] font-bold text-muted">{suffix}</span>
        </div>
        <RoundButton onClick={() => onChange(Math.min(max, value + step))} label={`Increase ${label}`}>
          +
        </RoundButton>
      </div>
    </div>
  );
}

function RoundButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-raised text-xl font-bold transition-colors hover:border-accent/50 active:scale-95"
    >
      {children}
    </button>
  );
}
