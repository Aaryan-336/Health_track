'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { useCelebration } from '@/stores/celebration';

/**
 * The animated completion moment. Reserved for real milestones so it stays a
 * treat rather than noise — and it fully respects reduced-motion.
 */
export function CelebrationOverlay() {
  const active = useCelebration((s) => s.active);
  const clear = useCelebration((s) => s.clear);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(clear, 9000);
    return () => clearTimeout(t);
  }, [active, clear]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (i * 37) % 100,
        delay: (i % 6) * 0.09,
        rotate: (i * 47) % 360,
        tone: ['bg-honey', 'bg-blush', 'bg-lilac', 'bg-sage', 'bg-sky'][i % 5]!,
        round: i % 3 === 0,
      })),
    [],
  );

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-canvas/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Celebration"
        >
          {!reduce &&
            confetti.map((c) => (
              <motion.span
                key={c.id}
                aria-hidden
                initial={{ y: '-15vh', opacity: 0, rotate: 0 }}
                animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: c.rotate }}
                transition={{ duration: 3.4, delay: c.delay, ease: 'easeIn', repeat: 1 }}
                style={{ left: `${c.x}%` }}
                className={`absolute top-0 h-3 w-2.5 ${c.tone} ${c.round ? 'rounded-full' : 'rounded-[2px]'}`}
              />
            ))}

          <div className="relative mx-6 max-w-sm text-center">
            <motion.div
              initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 16 }}
              className="mx-auto mb-6 grid h-28 w-28 place-items-center rounded-blob bg-accent-soft text-5xl shadow-float"
            >
              {active.emoji}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="font-display text-[2.1rem] leading-[1.1] tracking-[-0.03em]"
            >
              {active.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="mx-auto mt-3 max-w-[20rem] text-[1rem] leading-relaxed text-muted"
            >
              {active.body}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 }}
              className="mt-8"
            >
              <Button onClick={clear} size="lg">
                Lovely
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
