'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The two of you.
 *
 * A pig and a penguin turn up wherever a note is opened: waiting either side of
 * a sealed envelope, then leaning into each other once it has been read. Purely
 * decorative, so it stays hidden from assistive tech.
 */
export function PigAndPenguin({
  mood = 'waiting',
  size = '1.6rem',
  className,
}: {
  mood?: 'waiting' | 'together';
  size?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const together = mood === 'together';

  const spring = { type: 'spring' as const, stiffness: 220, damping: 18 };

  return (
    <span
      aria-hidden
      className={`inline-flex items-end justify-center ${className ?? ''}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <motion.span
        initial={false}
        animate={
          reduce
            ? { x: together ? 6 : 0 }
            : {
                x: together ? 7 : 0,
                rotate: together ? 12 : 0,
                y: together ? 0 : [0, -3, 0],
              }
        }
        transition={
          reduce
            ? { duration: 0 }
            : together
              ? spring
              : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
        }
        className="origin-bottom"
      >
        🐷
      </motion.span>

      {/* A small heart only once the note has actually been read. */}
      <motion.span
        initial={false}
        animate={{ opacity: together ? 1 : 0, scale: together ? 1 : 0.4, y: together ? -6 : 0 }}
        transition={{ ...spring, delay: together ? 0.25 : 0 }}
        style={{ fontSize: '0.55em' }}
        className="mx-[0.15em] self-center"
      >
        🤍
      </motion.span>

      <motion.span
        initial={false}
        animate={
          reduce
            ? { x: together ? -6 : 0 }
            : {
                x: together ? -7 : 0,
                rotate: together ? -12 : 0,
                y: together ? 0 : [0, -3, 0],
              }
        }
        transition={
          reduce
            ? { duration: 0 }
            : together
              ? spring
              : { duration: 2.6, delay: 1.3, repeat: Infinity, ease: 'easeInOut' }
        }
        className="origin-bottom"
      >
        🐧
      </motion.span>
    </span>
  );
}
