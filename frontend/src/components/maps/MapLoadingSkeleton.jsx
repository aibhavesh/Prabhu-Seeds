export default function MapLoadingSkeleton({ heightClass = 'h-72', label = 'Loading map...' }) {
  return (
    <div className={`w-full ${heightClass} bg-surface-container-low animate-pulse flex items-center justify-center text-on-surface-variant text-sm font-medium`}>
      {label}
    </div>
  )
}
