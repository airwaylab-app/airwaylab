export default function AnalyzeLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/30" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/30" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/30" />
        </div>
      </div>

      {/* Night selector skeleton */}
      <div className="mb-6 h-12 animate-pulse rounded-xl bg-muted/20" />

      {/* Metric cards skeleton */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card/30 p-4"
          >
            <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted/30" />
            <div className="mb-1 h-7 w-16 animate-pulse rounded bg-muted/40" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/20" />
          </div>
        ))}
      </div>

      {/* Insights skeleton */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-5">
        <div className="mb-4 h-5 w-24 animate-pulse rounded bg-muted/30" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted/30" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
                <div className="h-3 w-full animate-pulse rounded bg-muted/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
