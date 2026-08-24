/** The immersive note and letter screens own the whole viewport, so their
 *  loading state is a calm centred pulse rather than a page skeleton. */
export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-36 w-36 animate-pulse rounded-blob bg-line/40" />
    </div>
  );
}
