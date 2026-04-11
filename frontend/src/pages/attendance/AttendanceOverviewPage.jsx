import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAttendance, useAttendanceReport } from './hooks/useAttendance'
import AttendanceHeatmap from './components/AttendanceHeatmap'
import AttendanceShell from './components/AttendanceShell'

function formatClock(value) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatHours(value) {
  if (value == null) return '--'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return value
  return `${numeric.toFixed(1)}h`
}

function formatCurrency(value) {
  if (value == null) return '--'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return '--'
  return `₹ ${numeric.toLocaleString()}`
}

function gpsAccuracyBadge(accuracyMeters) {
  const accuracy = Number(accuracyMeters)
  if (Number.isNaN(accuracy)) {
    return { label: 'Unknown', className: 'bg-surface-container text-on-surface-variant' }
  }
  if (accuracy <= 10) {
    return { label: 'High', className: 'bg-primary/15 text-primary' }
  }
  if (accuracy <= 25) {
    return { label: 'Medium', className: 'bg-amber-500/15 text-amber-700' }
  }
  return { label: 'Low', className: 'bg-error/15 text-error' }
}

function normalizeCheckIns(payload) {
  const rows = payload?.today_check_ins ?? payload?.check_ins ?? payload?.records ?? payload?.items ?? []
  return rows.map((row, idx) => ({
    id: row.id ?? row.attendance_id ?? `${row.staff_id ?? row.name ?? 'row'}-${idx}`,
    staffId: row.staff_id ?? row.user_id ?? row.id ?? `staff-${idx}`,
    attendanceId: row.attendance_id ?? row.id,
    name: row.name ?? row.staff_name ?? row.staff?.name ?? 'Unknown',
    department: row.department ?? row.team ?? '--',
    checkIn: row.check_in ?? row.in_time ?? row.check_in_time,
    checkOut: row.check_out ?? row.out_time ?? row.check_out_time,
    hours: row.hours ?? row.hours_worked ?? row.total_hours,
    gpsAccuracy: row.gps_accuracy_m ?? row.gps_accuracy ?? row.gps?.accuracy,
    travelPay: row.travel_pay ?? row.travel_pay_inr ?? row.travel?.pay,
    travelClaimStatus: row.travel_claim_status ?? 'pending',
  }))
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" data-testid="attendance-overview-skeleton">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-container-lowest shadow-ghost" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1 h-80 bg-surface-container-lowest shadow-ghost" />
        <div className="xl:col-span-2 h-80 bg-surface-container-lowest shadow-ghost" />
      </div>
    </div>
  )
}

export default function AttendanceOverviewPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(6)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [approvedRows, setApprovedRows] = useState({})

  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useAttendance({
    page,
    pageSize,
    date,
  })

  const { data: reportData, isLoading: reportLoading } = useAttendanceReport({
    date,
    month: date.slice(0, 7),
  })

  const checkIns = useMemo(() => normalizeCheckIns(attendanceData), [attendanceData])

  const summary = attendanceData?.summary ?? reportData?.summary ?? {}
  const presentToday = Number(summary.present_today ?? checkIns.length)
  const absentToday = Number(summary.absent_today ?? 0)
  const avgHours = Number(summary.avg_hours ?? 0)
  const totalTravelKm = Number(summary.total_travel_km ?? 0)

  const heatmapDays = reportData?.calendar_days ?? reportData?.calendar ?? reportData?.days ?? []

  const pagination = attendanceData?.pagination ?? {
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((attendanceData?.total ?? checkIns.length) / pageSize)),
    total: attendanceData?.total ?? checkIns.length,
  }

  function handleApprove(row) {
    setApprovedRows((prev) => ({ ...prev, [row.id]: true }))
  }

  function handleExport() {
    const payload = {
      generatedAt: new Date().toISOString(),
      date,
      summary,
      rows: checkIns,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `attendance-report-${date}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AttendanceShell crumbs={['Attendance']}>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Attendance Overview</h1>
            <p className="text-on-surface-variant font-medium mt-1">Real-time field personnel tracking and compliance.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 bg-surface-container-lowest px-3 py-2 text-sm font-medium">
              <span className="material-symbols-outlined text-base" aria-hidden="true">calendar_today</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setPage(1)
                }}
                className="bg-transparent outline-none"
                aria-label="Attendance date"
              />
            </label>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2 text-xs font-bold tracking-widest uppercase"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
              Export Report
            </button>
          </div>
        </header>

        {(attendanceLoading || reportLoading) && <OverviewSkeleton />}

        {!attendanceLoading && !reportLoading && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <article className="bg-surface-container-lowest shadow-ghost px-5 py-4 relative">
                <span className="absolute left-0 top-0 h-full w-1 bg-primary" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Present Today</p>
                <p className="text-4xl font-black font-headline leading-none mt-1">{presentToday}</p>
              </article>

              <article className="bg-surface-container-lowest shadow-ghost px-5 py-4 relative">
                <span className="absolute left-0 top-0 h-full w-1 bg-error" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Absent Today</p>
                <p className="text-4xl font-black font-headline leading-none mt-1">{absentToday}</p>
              </article>

              <article className="bg-surface-container-lowest shadow-ghost px-5 py-4 relative">
                <span className="absolute left-0 top-0 h-full w-1 bg-secondary" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Avg Hours</p>
                <p className="text-4xl font-black font-headline leading-none mt-1">{avgHours.toFixed(1)}h</p>
              </article>

              <article className="bg-surface-container-lowest shadow-ghost px-5 py-4 relative">
                <span className="absolute left-0 top-0 h-full w-1 bg-tertiary" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Travel</p>
                <p className="text-4xl font-black font-headline leading-none mt-1">{totalTravelKm.toFixed(1)} km</p>
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
              <div className="xl:col-span-1">
                <AttendanceHeatmap days={heatmapDays} monthDate={new Date(`${date}T00:00:00`)} />
              </div>

              <div className="xl:col-span-2 bg-surface-container-lowest shadow-ghost overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
                  <h3 className="text-sm font-black uppercase tracking-widest">Today&apos;s Check-ins</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Active now: {checkIns.length}
                  </span>
                </div>

                {attendanceError && (
                  <div className="p-6 text-sm text-error">Failed to load attendance data.</div>
                )}

                {!attendanceError && (
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-high border-b border-outline-variant/10">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Staff Name</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Department</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Check-In</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Check-Out</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Hours</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">GPS Accuracy</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Travel Pay</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {checkIns.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-sm text-on-surface-variant text-center">
                            No check-ins found for selected date.
                          </td>
                        </tr>
                      ) : (
                        checkIns.map((row) => {
                          const badge = gpsAccuracyBadge(row.gpsAccuracy)
                          const approved = approvedRows[row.id] || row.travelClaimStatus === 'approved'

                          return (
                            <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/attendance/${row.staffId}/track?date=${date}`)}
                                  className="text-left"
                                >
                                  <span className="text-sm font-semibold text-on-surface hover:text-primary">{row.name}</span>
                                </button>
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">{row.department}</td>
                              <td className="px-4 py-3 text-sm font-mono text-on-surface-variant">{formatClock(row.checkIn)}</td>
                              <td className="px-4 py-3 text-sm font-mono text-on-surface-variant">{formatClock(row.checkOut)}</td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">{formatHours(row.hours)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-on-surface-variant">{formatCurrency(row.travelPay)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  disabled={approved}
                                  onClick={() => handleApprove(row)}
                                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                                    approved
                                      ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                                      : 'bg-primary text-on-primary hover:opacity-90'
                                  }`}
                                >
                                  {approved ? 'Approved' : 'Approve Travel Claim'}
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                )}

                <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/20">
                  <p className="text-xs text-on-surface-variant">
                    Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-surface-container-low text-on-surface-variant disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-surface-container-low text-on-surface-variant disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AttendanceShell>
  )
}
