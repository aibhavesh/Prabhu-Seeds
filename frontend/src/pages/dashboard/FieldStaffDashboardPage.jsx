import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, isPast } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useDutyStore } from '@/store/dutyStore'
import { useTasks } from '@/pages/tasks/hooks/useTasks'
import { useCheckIn, useCheckOut } from '@/pages/attendance/hooks/useAttendance'

function buildMockFieldData() {
  return {
    kpis: {
      tasksToday: 3,
      travelPay: 8450,
      attendanceDays: 22,
      attendanceTotal: 24,
    },
    weather: {
      location: 'Karnal, HR',
      temperature: 32,
      summary: 'Clear skies. Optimal for field visits and crop inspection.',
    },
    gps: {
      lat: 28.6139,
      lng: 77.209,
    },
    itinerary: [
      {
        id: 'it-1',
        type: 'Crop Audit',
        title: 'Dealer Stock Verification & Quality Check',
        place: 'Village: Brahman Majra / Area: Karnal North',
        status: 'pending',
        action: 'Start Task',
      },
      {
        id: 'it-2',
        type: 'Field Visit',
        title: 'Demonstration Plot - Hybrid Maize 404',
        place: 'Village: Nilokheri / Area: Karnal Central',
        status: 'in_progress',
        action: 'Resume',
      },
      {
        id: 'it-3',
        type: 'Payment',
        title: 'Dealer Payment Collection - Amit Agritech',
        place: 'Village: Taroari / Area: Karnal South',
        status: 'scheduled',
        action: 'Details',
      },
    ],
    precisionNote:
      'Soil moisture levels in Nilokheri sector are currently 12% below the seasonal average. Prioritize inspection of Maize 404 hybrid plots for water stress indicators during today\'s visit.',
  }
}

function normalizeFieldData(payload) {
  if (!payload || typeof payload !== 'object') return null

  return {
    ...buildMockFieldData(),
    ...payload,
    kpis: {
      ...buildMockFieldData().kpis,
      ...(payload.kpis ?? payload.summary ?? {}),
    },
    itinerary: Array.isArray(payload.itinerary) && payload.itinerary.length
      ? payload.itinerary
      : buildMockFieldData().itinerary,
  }
}

async function fetchFieldDashboard() {
  try {
    const response = await apiClient.get('/api/v1/dashboard/field')
    return normalizeFieldData(response.data) ?? buildMockFieldData()
  } catch {
    return buildMockFieldData()
  }
}

// Maps backend task status to display label + pill colour
const STATUS_META = {
  assigned:  { label: 'Pending',     cls: 'bg-amber-500/15 text-amber-700' },
  running:   { label: 'In Progress', cls: 'bg-primary/15 text-primary' },
  hold:      { label: 'On Hold',     cls: 'bg-gray-200 text-gray-600' },
  completed: { label: 'Completed',   cls: 'bg-green-100 text-green-700' },
}

function statusMeta(status) {
  return STATUS_META[status] ?? { label: status, cls: 'bg-surface-container-low text-on-surface-variant' }
}

function taskTypeClass(type) {
  const lower = String(type ?? '').toLowerCase()
  if (lower.includes('crop') || lower.includes('seed') || lower.includes('soil')) return 'bg-primary/10 text-primary'
  if (lower.includes('field') || lower.includes('visit') || lower.includes('survey')) return 'bg-secondary/10 text-secondary'
  if (lower.includes('payment') || lower.includes('collection') || lower.includes('dealer')) return 'bg-tertiary/15 text-tertiary'
  if (lower.includes('meet') || lower.includes('farmer') || lower.includes('market')) return 'bg-emerald-500/15 text-emerald-700'
  return 'bg-surface-container text-on-surface-variant'
}

export default function FieldStaffDashboardPage() {
  const user = useAuthStore((store) => store.user)
  const { checkedIn, dutyStartedAt, checkIn, checkOut } = useDutyStore()
  const navigate = useNavigate()
  const checkInMutation = useCheckIn()
  const checkOutMutation = useCheckOut()

  // Initialise from persisted start time so navigation doesn't reset the clock
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    dutyStartedAt ? Math.floor((Date.now() - dutyStartedAt) / 1000) : 0
  )

  const dashboardQuery = useQuery({
    queryKey: ['field-dashboard'],
    queryFn: fetchFieldDashboard,
    placeholderData: (prev) => prev,
  })

  // Fetch real tasks for this field user
  const { data: tasksData, isLoading: tasksLoading } = useTasks({})

  // Active = not yet completed, sorted: running first then assigned then hold
  const activeTasks = useMemo(() => {
    const ORDER = { running: 0, assigned: 1, hold: 2 }
    return (tasksData?.tasks ?? [])
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9))
  }, [tasksData])

  const dashboard = dashboardQuery.data ?? buildMockFieldData()

  useEffect(() => {
    if (!checkedIn || !dutyStartedAt) return undefined

    const timerId = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - dutyStartedAt) / 1000))
    }, 1000)

    return () => clearInterval(timerId)
  }, [checkedIn, dutyStartedAt])

  const dutyClock = useMemo(() => {
    const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')
    const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')
    const seconds = String(elapsedSeconds % 60).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }, [elapsedSeconds])

  function getGpsPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve({ lat: 0, lng: 0 }); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 0, lng: 0 }),
        { timeout: 6000 },
      )
    })
  }

  async function toggleDuty() {
    const { lat, lng } = await getGpsPosition()
    if (checkedIn) {
      checkOutMutation.mutate({ lat, lng, km: 0 }, {
        onSettled: () => { checkOut(); setElapsedSeconds(0) },
      })
    } else {
      checkInMutation.mutate({ lat, lng }, {
        onSuccess: () => { checkIn(); setElapsedSeconds(0) },
        onError: (err) => {
          // Already checked in today — sync local state
          const msg = err?.response?.data?.detail ?? ''
          if (msg.toLowerCase().includes('already')) { checkIn(); setElapsedSeconds(0) }
        },
      })
    }
  }

  const dutyBusy = checkInMutation.isPending || checkOutMutation.isPending

  return (
    <DashboardShell
      footer={
        <div className="bg-surface-container-lowest px-2 py-2 flex items-center gap-2">
          <span className="h-6 w-6 rounded-sm bg-surface-container-high inline-flex items-center justify-center text-[10px] font-bold">
            {String(user?.name ?? 'RK').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div>
            <p className="text-[10px] font-semibold text-on-surface">{user?.name ?? 'Rajesh Kumar'}</p>
            <p className="text-[9px] text-on-surface-variant">Field Officer</p>
          </div>
        </div>
      }
      topbar={
        <DashboardTopbar
          left={
            <div className="flex items-center gap-2 text-xs">
              <span className="text-lg font-black font-headline text-primary">PGA AgriTask</span>
              <span className="text-on-surface-variant/40">/</span>
              <span className="font-semibold text-primary">Dashboard</span>
            </div>
          }
          right={
            <>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center text-on-surface-variant" aria-label="Team alerts">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">group</span>
              </button>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center text-on-surface-variant" aria-label="Notifications">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">notifications</span>
              </button>
              <span className="h-7 w-7 rounded-sm bg-primary-container text-on-primary text-[11px] font-bold inline-flex items-center justify-center">
                {String(user?.name ?? 'RK').trim().slice(0, 1).toUpperCase()}
              </span>
            </>
          }
        />
      }
    >
      <div className="max-w-6xl mx-auto space-y-4">
        <section className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Operational Overview</p>
            <h1 className="text-4xl font-black font-headline">Field Dashboard</h1>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-on-surface-variant">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
            <p className="text-xs font-mono text-outline">
              GPS: {dashboard.gps.lat.toFixed(4)}\u00b0 N, {dashboard.gps.lng.toFixed(4)}\u00b0 E
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-3">
          <article className="bg-surface-container-lowest border-l-4 border-primary px-4 py-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-black font-headline inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[19px]" aria-hidden="true">location_on</span>
                Duty Status
              </h2>

              {checkedIn ? (
                <>
                  <p className="text-on-surface mt-2">On duty and live tracking active.</p>
                  <p className="text-2xl font-black font-mono text-primary mt-1">{dutyClock}</p>
                </>
              ) : (
                <>
                  <p className="text-on-surface mt-2">You haven't checked in today</p>
                  <p className="text-xs text-on-surface-variant mt-1">Checking in will start live location tracking for field travel logging.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleDuty}
              disabled={dutyBusy}
              className={`h-10 px-8 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-60 disabled:cursor-not-allowed ${checkedIn ? 'bg-error text-white' : 'bg-primary text-on-primary'}`}
            >
              {dutyBusy ? '…' : checkedIn ? 'Check Out' : 'Check In'}
            </button>
          </article>

          <article className="bg-surface-container-lowest p-4 relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">Weather: {dashboard.weather.location}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-tertiary" aria-hidden="true">wb_sunny</span>
              <span className="text-5xl font-black font-headline">{dashboard.weather.temperature}\u00b0C</span>
            </div>
            <p className="text-sm text-on-surface-variant mt-2">{dashboard.weather.summary}</p>
            <span className="material-symbols-outlined absolute -right-5 -bottom-5 text-[130px] opacity-10" aria-hidden="true">agriculture</span>
          </article>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <article className="bg-surface-container-lowest border-l-4 border-primary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">My Active Tasks</p>
            <p className="text-5xl font-black font-headline mt-1">
              {tasksLoading ? '…' : activeTasks.length}
            </p>
            <p className="text-xs text-primary mt-1">
              {activeTasks.filter(t => t.status === 'running').length} in progress
            </p>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-secondary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Travel Pay</p>
            <p className="text-5xl font-black font-headline mt-1">\u20B9{dashboard.kpis.travelPay.toLocaleString('en-IN')}</p>
            <p className="text-xs text-secondary mt-1">October</p>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-tertiary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Attendance</p>
            <p className="text-5xl font-black font-headline mt-1">
              {dashboard.kpis.attendanceDays}/{dashboard.kpis.attendanceTotal}
            </p>
            <p className="text-xs text-tertiary mt-1">Days</p>
          </article>
        </section>

        <section className="bg-surface-container-lowest p-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-2xl font-black font-headline">Active Itinerary</h2>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="text-xs font-bold uppercase tracking-wider text-primary hover:opacity-80"
            >
              View All Tasks
            </button>
          </div>

          {tasksLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-surface-container-low animate-pulse" />
              ))}
            </div>
          )}

          {!tasksLoading && activeTasks.length === 0 && (
            <div className="py-10 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40" aria-hidden="true">task_alt</span>
              <p className="text-sm text-on-surface-variant mt-2">No active tasks assigned.</p>
            </div>
          )}

          {!tasksLoading && activeTasks.length > 0 && (
            <div className="space-y-2">
              {activeTasks.map((task) => {
                const sm = statusMeta(task.status)
                const isRepeat = (task.repeat_count ?? 1) > 1
                const deadline = task.deadline
                const overdue = deadline && isPast(parseISO(deadline)) && task.status !== 'completed'
                const actionLabel = task.status === 'running' ? 'Submit' : task.status === 'hold' ? 'Resume' : 'Start'

                return (
                  <article
                    key={task.id}
                    className="bg-surface-container-low px-3 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`mt-0.5 flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${taskTypeClass(task.activity_type)}`}>
                        {task.activity_type ?? 'Task'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{task.title}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {task.district_id && (
                            <span className="text-xs text-on-surface-variant">
                              {task.district_id}
                            </span>
                          )}
                          {task.dept && (
                            <span className="text-xs text-on-surface-variant/60">{task.dept}</span>
                          )}
                          {deadline && (
                            <span className={`text-xs font-mono ${overdue ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
                              {overdue ? 'Overdue · ' : ''}{format(parseISO(deadline), 'dd MMM')}
                            </span>
                          )}
                          {isRepeat && (
                            <span className="text-xs text-primary font-semibold">
                              {task.record_count ?? 0}/{task.repeat_count} done
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${sm.cls}`}>
                        {sm.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/tasks')}
                        className="h-8 px-3 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider hover:opacity-90"
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-3">
          <article className="bg-gradient-to-br from-slate-900 via-emerald-950 to-green-900 text-white p-4 min-h-[180px] relative overflow-hidden">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-36 w-36 rounded-full border-4 border-white/50" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 material-symbols-outlined text-[64px] opacity-70">location_on</span>
            <div className="absolute left-4 bottom-4">
              <p className="text-[10px] uppercase tracking-widest text-white/80">Route Optimized</p>
              <p className="text-3xl font-black font-headline">Current Sector: Karnal North</p>
              <p className="text-xs text-white/80 mt-1">Distance: 12.4 km total   ETA: 45 mins</p>
            </div>
          </article>

          <article className="bg-surface-container-lowest p-4">
            <h3 className="text-2xl font-black font-headline">Precision Note</h3>
            <p className="text-sm text-on-surface-variant mt-3 leading-6">{dashboard.precisionNote}</p>
            <div className="mt-5 pt-3 border-t border-outline-variant/20 text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">HQ Alert</div>
          </article>
        </section>
      </div>
    </DashboardShell>
  )
}
