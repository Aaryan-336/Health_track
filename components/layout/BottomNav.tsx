'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

import { cn } from '@/lib/cn';
import { useUI } from '@/stores/ui';

/** Home · Goals · Add · Together · Profile — the navigation from the design doc. */

const ITEMS = [
  { href: '/home', label: 'Home', icon: HomeIcon },
  { href: '/goals', label: 'Goals', icon: TargetIcon },
  { href: '/us', label: 'Together', icon: HeartIcon },
  { href: '/profile', label: 'You', icon: PersonIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const setAddSheet = useUI((s) => s.setAddSheet);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 pb-safe"
    >
      <div className="mx-auto max-w-md px-4 pb-2">
        <div className="relative flex items-center justify-around rounded-[1.75rem] border border-line/70 bg-surface/85 px-2 py-2 shadow-float backdrop-blur-xl">
          {ITEMS.slice(0, 2).map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}

          <button
            type="button"
            onClick={() => setAddSheet(true)}
            aria-label="Add an entry"
            className="relative -mt-7 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-float transition-transform duration-200 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>

          {ITEMS.slice(2).map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: (p: { className?: string; filled?: boolean }) => React.ReactElement;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-2xl transition-colors duration-200',
        active ? 'text-ink' : 'text-faint hover:text-muted',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-2xl bg-accent-soft"
        />
      )}
      <span className="relative">
        <Icon className="h-[1.35rem] w-[1.35rem]" filled={active} />
      </span>
      <span className="relative text-[0.65rem] font-bold tracking-wide">{label}</span>
    </Link>
  );
}

function HomeIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TargetIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 20s-7-4.4-7-9.2A4.3 4.3 0 0 1 12 8.4a4.3 4.3 0 0 1 7 2.4C19 15.6 12 20 12 20Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="8.5" r="3.6" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
