import { cn } from '@/lib/cn';

const PALETTE = ['bg-blush-soft', 'bg-lilac-soft', 'bg-sage-soft', 'bg-honey-soft', 'bg-sky-soft', 'bg-clay-soft'];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
  ring,
}: {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
}) {
  const dims = {
    xs: 'h-7 w-7 text-[0.65rem]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  }[size];

  // Stable colour per person so avatars stay recognisable between screens.
  const tone = PALETTE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length]!;

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold text-ink',
        tone,
        dims,
        ring && 'ring-2 ring-accent ring-offset-2 ring-offset-canvas',
        className,
      )}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
