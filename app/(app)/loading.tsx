/**
 * Shown the instant a tap starts, for every screen in the app.
 *
 * These pages are all dynamic — they read your live data, so nothing can be
 * cached — and without a loading boundary Next.js keeps the previous screen on
 * screen, frozen, until the server has finished. That reads as the app having
 * hung. Next also prefetches this boundary, so the skeleton is already in the
 * browser when the tap lands and the response feels immediate.
 */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      {/* Greeting */}
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-3.5 w-24 rounded-pill bg-line/60" />
          <div className="mt-2.5 h-8 w-40 rounded-pill bg-line/50" />
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="h-11 w-11 rounded-full bg-line/50" />
          <div className="h-12 w-12 rounded-full bg-line/50" />
        </div>
      </header>

      {/* Week strip */}
      <div className="mb-6 flex justify-between gap-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="h-2.5 w-3 rounded-pill bg-line/50" />
            <div className="h-9 w-9 rounded-full bg-line/40" />
          </div>
        ))}
      </div>

      {/* Hero card */}
      <div className="mb-7 rounded-card border border-line/50 bg-surface/60 p-5">
        <div className="mx-auto h-3.5 w-48 rounded-pill bg-line/50" />
        <div className="mx-auto my-6 h-44 w-44 rounded-full border-[10px] border-line/40" />
        <div className="mx-auto h-6 w-32 rounded-pill bg-line/40" />
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-card border border-line/50 bg-surface/60 p-4"
          >
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-line/50" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-2/5 rounded-pill bg-line/50" />
              <div className="mt-2 h-3 w-3/5 rounded-pill bg-line/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
