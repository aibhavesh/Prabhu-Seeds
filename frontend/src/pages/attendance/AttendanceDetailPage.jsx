import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import GPSTrackMap from './components/GPSTrackMap'
import { useAttendanceReport } from './hooks/useAttendance'
import AttendanceShell from './components/AttendanceShell'

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" data-testid="attendance-detail-skeleton">
      <div className="h-8 w-64 bg-surface-container-low" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="h-[620px] bg-surface-container-lowest shadow-ghost" />
        <div className="h-[620px] bg-surface-container-lowest shadow-ghost" />
      </div>
    </div>
  )
}

function summarizeTrack(points) {
  if (!points?.length) {
    return {
      distanceKm: 0,
      durationHours: 0,
      waypoints: 0,
      estimatedPay: 0,
    }
  }

  const distanceKm = points.reduce((acc, point) => acc + Number(point.distance_delta_km ?? 0), 0)
  const first = new Date(points[0].timestamp)
  const last = new Date(points[points.length - 1].timestamp)
  const durationHours = Number.isFinite(first.getTime()) && Number.isFinite(last.getTime())
    ? (last - first) / (1000 * 60 * 60)
    : 0

  return {
    distanceKm,
    durationHours,
    waypoints: points.length,
    estimatedPay: distanceKm * 8,
  }
}

export default function AttendanceDetailPage() {
  const navigate = useNavigate()
  const { staffId } = useParams()
  const [searchParams] = useSearchParams()
  const date = searchParams.get('date')

  const { data, isLoading, isError } = useAttendanceReport({
    staffId,
    date,
  })

  const points = useMemo(
    () => data?.track_points ?? data?.points ?? [],
    [data]
  )
  const waypoints = useMemo(
    () => data?.waypoints ?? points,
    [data, points]
  )
  const staffName = data?.staff?.name ?? data?.staff_name ?? 'Field Staff'
  const staffDepartment = data?.staff?.department ?? data?.department ?? 'Operations'
  const summary = data?.summary ?? summarizeTrack(points)

  const latestDateLabel = useMemo(() => {
    if (!points.length) return date ?? '--'
    const parsed = new Date(points[points.length - 1].timestamp)
    if (Number.isNaN(parsed.getTime())) return date ?? '--'
    return parsed.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
  }, [points, date])

  const topRightSlot = (
    <div className="hidden sm:inline-flex items-center gap-3 bg-surface-container-low px-3 py-1">
      <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
      <p className="text-[11px] font-black uppercase tracking-wide text-on-surface">
        {staffName} · {staffDepartment}
      </p>
      <p className="text-[10px] text-on-surface-variant font-medium">{latestDateLabel}</p>
    </div>
  )

  return (
    <AttendanceShell crumbs={['Attendance', 'GPS Track']} rightSlot={topRightSlot}>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="inline-flex items-center gap-1 text-primary hover:opacity-80 text-sm font-medium"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_back</span>
          Back to Attendance
        </button>

        {isLoading && <DetailSkeleton />}

        {!isLoading && isError && (
          <div className="bg-surface-container-lowest shadow-ghost p-8 text-error">
            Failed to load GPS attendance report.
          </div>
        )}

        {!isLoading && !isError && (
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
            <GPSTrackMap points={points} />

            <aside className="bg-surface-container-lowest shadow-ghost p-4 space-y-6">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Route Summary</h3>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Distance</p>
                    <p className="text-3xl font-black font-headline">{Number(summary.distanceKm ?? 0).toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration</p>
                    <p className="text-3xl font-black font-headline">{Number(summary.durationHours ?? 0).toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Waypoints</p>
                    <p className="text-2xl font-black font-headline">{summary.waypoints ?? waypoints.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">TA/DA Est.</p>
                    <p className="text-2xl font-black font-headline text-primary">₹{Number(summary.estimatedPay ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Detailed Waypoint Log</h3>
                <ul className="mt-3 space-y-0 max-h-[460px] overflow-y-auto">
                  {waypoints.map((point, idx) => (
                    <li key={`${point.timestamp ?? idx}-${idx}`} className="relative pl-8 pb-5">
                      <span className={`absolute left-0 top-1 h-2 w-2 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-outline-variant'}`} />
                      {idx !== waypoints.length - 1 && <span className="absolute left-[3px] top-3 h-full w-px bg-outline-variant/50" />}
                      <p className="text-xs font-bold text-on-surface-variant">
                        {point.timestamp ? new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                      </p>
                      <p className="text-sm font-semibold text-on-surface">{point.location_name ?? point.address ?? 'Waypoint'}</p>
                      <p className="text-xs text-on-surface-variant">
                        Speed: {point.speed_kmh ?? point.speed ?? 0} km/h · {point.movement ?? 'Moving'}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className="w-full bg-surface-container-low px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-surface-container"
              >
                Export KML/GPX Data
              </button>
            </aside>
          </section>
        )}
      </div>
    </AttendanceShell>
  )
}
