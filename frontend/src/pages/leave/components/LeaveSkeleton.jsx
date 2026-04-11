export function LeaveCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest shadow-ghost p-4 animate-pulse" data-testid="leave-skeleton">
      <div className="h-3 w-24 bg-surface-container-low" />
      <div className="h-8 w-28 bg-surface-container-low mt-2" />
      <div className="h-3 w-20 bg-surface-container-low mt-2" />
    </div>
  )
}

export function LeavePanelSkeleton({ rows = 4, testId = 'leave-skeleton' }) {
  return (
    <div className="bg-surface-container-lowest shadow-ghost p-4 animate-pulse space-y-3" data-testid={testId}>
      <div className="h-4 w-44 bg-surface-container-low" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-12 w-full bg-surface-container-low" />
      ))}
    </div>
  )
}
