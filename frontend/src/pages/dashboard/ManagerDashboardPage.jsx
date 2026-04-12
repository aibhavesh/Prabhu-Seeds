import { useMemo } from 'react'
import { format, getDaysInMonth, startOfMonth } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import NotificationBell from '@/features/notifications/NotificationBell'
import { useAuthStore } from '@/store/authStore'
import { usePendingLeaveRequests, useReviewLeaveRequest } from '@/pages/leave/hooks/useLeaves'
import { useAttendanceReport } from '@/pages/attendance/hooks/useAttendance'
import { useTasks, useFieldStaff } from '@/pages/tasks/hooks/useTasks'
import { useTravelClaims } from '@/pages/travel/hooks/useTravel'

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Maps attendance_pct to a level label for calendar cells
function pctToLevel(pct, date) {
  const dow = new Date(date).getDay() // 0=Sun 6=Sat
  if (dow === 0 || dow === 6) return 'off'
  if (pct == null) return 'none'
  if (pct >= 80) return 'high'
  if (pct >= 50) return 'mid'
  if (pct > 0) return 'low'
  return 'absent'
}

function attendanceDot(level) {
  if (level === 'high' || level === 'today') return 'bg-primary-container'
  if (level === 'mid') return 'bg-amber-500'
  if (level === 'low' || level === 'absent') return 'bg-error'
  return 'bg-transparent'
}

function safeNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toCsvLine(cells) {
  return cells.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')
}

export default function ManagerDashboardPage() {
  const user = useAuthStore((store) => store.user)
  const navigate = useNavigate()

  const currentMonth = format(new Date(), 'yyyy-MM')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // ── Real data queries ─────────────────────────────────────────────────────
  const pendingLeavesQuery = usePendingLeaveRequests()
  const reviewLeave = useReviewLeaveRequest()
  const attendanceReportQuery = useAttendanceReport({ month: currentMonth, date: todayStr })
  const tasksQuery = useTasks({})
  const fieldStaffQuery = useFieldStaff()
  const travelQuery = useTravelClaims({ month: currentMonth })

  // ── KPI computations ──────────────────────────────────────────────────────
  const tasks = tasksQuery.data?.tasks ?? []
  const pendingLeaves = useMemo(() => {
    const rows = pendingLeavesQuery.data
    const arr = rows?.leaves ?? rows?.items ?? rows?.data ?? (Array.isArray(rows) ? rows : [])
    return arr.filter((r) => String(r.status ?? 'pending').toLowerCase() === 'pending')
  }, [pendingLeavesQuery.data])

  const travelClaims = useMemo(() => {
    const raw = travelQuery.data
    const arr = raw?.claims ?? raw?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : [])
    return arr
  }, [travelQuery.data])

  const monthlyTravelInr = useMemo(
    () => travelClaims.reduce((sum, c) => sum + safeNumber(c.amount_inr ?? c.amount ?? c.amountInr), 0),
    [travelClaims]
  )

  const fieldStaff = fieldStaffQuery.data ?? []

  // ── Attendance calendar cells from real report ────────────────────────────
  const calendarCells = useMemo(() => {
    const report = attendanceReportQuery.data
    const calDays = report?.calendar_days ?? []
    const byDate = Object.fromEntries(calDays.map((d) => [d.date, d]))

    const monthStart = startOfMonth(new Date())
    const daysInMonth = getDaysInMonth(new Date())
    const today = new Date().getDate()

    // Build cells starting from day 1, offset by first weekday (Mon=0)
    const firstDow = (monthStart.getDay() + 6) % 7 // Mon=0
    const cells = []
    // Empty padding cells
    for (let i = 0; i < firstDow; i++) cells.push({ day: null, level: 'off' })
    // Actual day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`
      const dayData = byDate[dateStr]
      const isToday = d === today
      cells.push({
        day: d,
        level: isToday ? 'today' : pctToLevel(dayData?.attendance_pct, dateStr),
      })
    }
    return cells
  }, [attendanceReportQuery.data, currentMonth])

  const presentToday = safeNumber(attendanceReportQuery.data?.summary?.present_today ?? attendanceReportQuery.data?.present_today)
  const teamSize = fieldStaff.length || safeNumber(attendanceReportQuery.data?.summary?.team_size)

  // ── Check-in counts ───────────────────────────────────────────────────────
  const checkInsCompleted = presentToday || teamSize
  const checkInsTotal = teamSize

  // ── Team rows (field staff + their task counts) ────────────────────────────
  const teamRows = useMemo(() => {
    return fieldStaff.map((member) => {
      const memberId = String(member.id)
      const memberTasks = tasks.filter(
        (t) => String(t.assigned_to) === memberId || (t.members ?? []).map(String).includes(memberId)
      )
      const doneTasks = memberTasks.filter((t) => t.status === 'completed').length
      return {
        id: memberId,
        name: member.name ?? member.full_name ?? 'Unknown',
        avatar: String(member.name ?? 'NA').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
        department: member.dept ?? member.department ?? '—',
        totalTasks: memberTasks.length,
        doneTasks,
      }
    })
  }, [fieldStaff, tasks])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleDecision(leaveId, decision) {
    try {
      await toast.promise(reviewLeave.mutateAsync({ leaveId, decision }), {
        loading: decision === 'approved' ? 'Approving…' : 'Rejecting…',
        success: `Request ${decision}.`,
        error: 'Could not update request.',
      })
    } catch { /* toast handles error */ }
  }

  function exportTeamCsv() {
    const header = ['Name', 'Department', 'Total Tasks', 'Completed Tasks']
    const lines = teamRows.map((r) => toCsvLine([r.name, r.department, r.totalTasks, r.doneTasks]))
    const blob = new Blob([[toCsvLine(header), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-status-${currentMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const monthLabel = format(new Date(), 'MMMM yyyy')

  return (
    <DashboardShell
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
              <NotificationBell />
              <span className="h-7 w-7 rounded-sm bg-surface-container-high text-on-surface text-[11px] font-bold inline-flex items-center justify-center">
                {String(user?.name ?? 'M').trim().split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </>
          }
        />
      }
    >
      <div className="max-w-6xl mx-auto space-y-4">

        {/* ── KPI cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <article className="bg-surface-container-lowest border-l-4 border-primary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Team Tasks</p>
            <p className="text-5xl font-black font-headline mt-1">{tasksQuery.isLoading ? '…' : tasks.length}</p>
            <p className="text-xs text-primary mt-2">{tasks.filter((t) => t.status === 'running').length} in progress</p>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-secondary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Today's Check-ins</p>
            <p className="text-5xl font-black font-headline mt-1">
              {attendanceReportQuery.isLoading ? '…' : `${checkInsCompleted}/${checkInsTotal}`}
            </p>
            {checkInsTotal > 0 && (
              <div className="h-1 bg-surface-container mt-3">
                <div className="h-full bg-secondary" style={{ width: `${(checkInsCompleted / checkInsTotal) * 100}%` }} />
              </div>
            )}
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-tertiary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Pending Approvals</p>
            <p className="text-5xl font-black font-headline mt-1">
              {pendingLeavesQuery.isLoading ? '…' : pendingLeaves.length}
            </p>
            <p className="text-xs text-tertiary mt-2">Leave requests awaiting review</p>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-primary-container px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Monthly Travel</p>
            <p className="text-4xl font-black font-headline mt-2">
              {travelQuery.isLoading ? '…' : `₹${monthlyTravelInr.toLocaleString('en-IN')}`}
            </p>
            <p className="text-xs text-on-surface-variant mt-2">Approved claims this month</p>
          </article>
        </section>

        {/* ── Attendance calendar + Pending approvals ── */}
        <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-3">
          <article className="bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h2 className="text-2xl font-black font-headline text-on-surface">Team Attendance — {monthLabel}</h2>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary-container" />{'>'}80%</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />50–80%</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error" />{'<'}50%</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-[10px] font-bold text-center text-on-surface-variant pb-1">{day}</div>
              ))}
              {calendarCells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`aspect-square border border-outline-variant/10 flex flex-col items-center justify-center relative text-xs font-semibold
                    ${cell.level === 'today' ? 'bg-primary/5 border-primary' : 'bg-surface-container-lowest'}
                    ${!cell.day ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  {cell.day && (
                    <>
                      <span>{cell.day}</span>
                      <span className={`h-1.5 w-1.5 rounded-full mt-1 ${attendanceDot(cell.level)}`} />
                      {cell.level === 'today' && (
                        <span className="absolute top-0.5 right-0.5 text-[7px] font-bold text-primary">TODAY</span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-2xl font-black font-headline text-on-surface">Pending Approvals</h2>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-widest">
                {pendingLeaves.length} New
              </span>
            </div>

            <div className="space-y-2">
              {pendingLeavesQuery.isLoading ? (
                <div className="h-24 bg-surface-container-low animate-pulse" />
              ) : pendingLeaves.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No pending approvals.</p>
              ) : (
                pendingLeaves.slice(0, 5).map((leave) => {
                  const name = leave.staff_name ?? leave.user_name ?? leave.employee_name ?? 'Staff'
                  const initials = String(name).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                  const meta = `${String(leave.leave_type ?? leave.type ?? 'Leave').replace(/^\w/, (c) => c.toUpperCase())} · ${leave.duration_days ?? leave.days ?? 1} day(s)`
                  return (
                    <div key={leave.id} className="flex items-center justify-between gap-2 bg-surface-container-low p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-7 w-7 rounded-full bg-surface-container-high text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{name}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">{meta}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDecision(leave.id, 'rejected')}
                          disabled={reviewLeave.isPending}
                          className="h-6 w-6 inline-flex items-center justify-center border border-error/40 text-error text-xs disabled:opacity-50"
                          aria-label={`Reject leave for ${name}`}
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(leave.id, 'approved')}
                          disabled={reviewLeave.isPending}
                          className="h-6 w-6 inline-flex items-center justify-center bg-primary text-on-primary text-xs disabled:opacity-50"
                          aria-label={`Approve leave for ${name}`}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/leave/manage')}
              className="mt-4 text-xs font-bold uppercase tracking-wider text-primary hover:opacity-80"
            >
              View all approvals →
            </button>
          </article>
        </section>

        {/* ── Team status table ── */}
        <section className="bg-surface-container-lowest border border-outline-variant/20">
          <div className="px-4 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-black font-headline text-on-surface">Team Status — {monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportTeamCsv}
                className="h-7 px-3 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full">
              <thead>
                <tr className="bg-surface-container-low text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  <th className="px-3 py-3 text-left">Staff Member</th>
                  <th className="px-3 py-3 text-left">Department</th>
                  <th className="px-3 py-3 text-left">Tasks</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {fieldStaffQuery.isLoading ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-on-surface-variant animate-pulse">Loading team…</td></tr>
                ) : teamRows.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-on-surface-variant">No field staff found.</td></tr>
                ) : (
                  teamRows.map((row) => (
                    <tr key={row.id} className="border-t border-outline-variant/15 hover:bg-surface-container-low/50">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-surface-container-high text-[10px] font-bold inline-flex items-center justify-center">
                            {row.avatar}
                          </span>
                          <span className="text-sm font-semibold">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-on-surface-variant">{row.department}</td>
                      <td className="px-3 py-3 text-sm font-semibold">
                        {row.doneTasks}/{row.totalTasks} done
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate('/tasks')}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:opacity-80"
                        >
                          Assign Task
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
