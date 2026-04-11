export default function TravelSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-4 animate-pulse" data-testid="travel-skeleton">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-container-lowest shadow-ghost" />
        ))}
      </div>

      <div className="bg-surface-container-lowest shadow-ghost p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-container-low" />
        ))}
      </div>
    </div>
  )
}