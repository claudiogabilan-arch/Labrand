import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';

/**
 * Reusable skeleton patterns for first-load states.
 * Each pattern mirrors the final DOM structure so data arrival
 * does not cause layout shift. Uses Tailwind's `animate-pulse`
 * via the base Skeleton component (subtle, no aggressive motion).
 */

export function SkeletonHero({ className = '' }) {
  return (
    <Card className={`border border-border/50 overflow-hidden ${className}`} data-testid="skeleton-hero">
      <CardContent className="py-10">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-20 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="w-full md:w-80 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-9 w-32 mt-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonCard({ lines = 3, className = '', showHeader = true }) {
  return (
    <Card className={className} data-testid="skeleton-card">
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ items = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} data-testid="skeleton-list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`border rounded-lg overflow-hidden ${className}`} data-testid="skeleton-table">
      {/* header */}
      <div className="grid gap-3 p-4 border-b bg-muted/30" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      {/* rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 p-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'w-5/6' : 'w-3/4'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 240, className = '' }) {
  return (
    <div
      className={`relative rounded-lg border bg-gradient-to-br from-primary/5 via-muted/20 to-transparent overflow-hidden animate-pulse ${className}`}
      style={{ height }}
      data-testid="skeleton-chart"
    >
      {/* Y-axis ticks */}
      <div className="absolute left-3 top-3 bottom-6 flex flex-col justify-between">
        <Skeleton className="h-2 w-6" />
        <Skeleton className="h-2 w-6" />
        <Skeleton className="h-2 w-6" />
        <Skeleton className="h-2 w-6" />
      </div>
      {/* Chart area (faux bars) */}
      <div className="absolute left-12 right-4 top-4 bottom-8 flex items-end gap-2">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <div key={i} className="flex-1 bg-primary/15 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
      {/* X-axis ticks */}
      <div className="absolute left-12 right-4 bottom-2 flex justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-6" />
        ))}
      </div>
    </div>
  );
}
