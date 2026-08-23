import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-7 grid h-24 w-24 place-items-center rounded-blob bg-blush-soft text-5xl shadow-soft">
        🌸
      </div>

      <h1 className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.035em]">
        Look after each other
      </h1>
      <p className="mx-auto mt-4 max-w-[19rem] text-[1rem] leading-relaxed text-muted">
        A soft, private space for two people to track their health — and cheer each
        other on while they do.
      </p>

      <div className="mt-9 space-y-3">
        <Link
          href="/sign-up"
          className="grid h-14 w-full place-items-center rounded-pill bg-accent font-bold text-accent-ink shadow-lift transition-transform active:scale-[0.98]"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="grid h-14 w-full place-items-center rounded-pill border border-line bg-surface font-bold transition-colors hover:border-accent/40"
        >
          I already have an account
        </Link>
      </div>

      <p className="mt-7 text-[0.8rem] leading-relaxed text-faint">
        Your health data stays private by default. You choose what your partner sees.
      </p>
    </div>
  );
}
