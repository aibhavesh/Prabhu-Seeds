import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import NotificationBell from '@/features/notifications/NotificationBell'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function buildMockManagerData() {
  return {
    kpis: {
      teamTasks: 89,
      taskGrowthPct: 12,
      checkInsCompleted: 12,
      checkInsTotal: 15,
      pendingApprovals: 7,
      urgentApprovals: 3,
      monthlyTravel: 124500,
    },
    attendance: {
      monthLabel: 'June 2026',
      cells: [
        { day: 1, level: 'high' },
        { day: 2, level: 'high' },
        { day: 3, level: 'mid' },
        { day: 4, level: 'high' },
        { day: 5, level: 'high' },
        { day: 6, level: 'off' },
        { day: 7, level: 'off' },
        { day: 8, level: 'today' },
        { day: 9, level: 'high' },
        { day: 10, level: 'low' },
        { day: 11, level: 'high' },
        { day: 12, level: 'high' },
        { day: 13, level: 'off' },
        { day: 14, level: 'off' },
        { day: 15, level: 'high' },
        { day: 16, level: 'high' },
        { day: 17, level: 'mid' },
        { day: 18, level: 'high' },
        { day: 19, level: 'high' },
        { day: 20, level: 'off' },
        { day: 21, level: 'off' },
        { day: 22, level: 'high' },
        { day: 23, level: 'high' },
        { day: 24, level: 'high' },
        { day: 25, level: 'mid' },
        { day: 26, level: 'high' },
        { day: 27, level: 'off' },
        { day: 28, level: 'off' },
        { day: 29, level: 'high' },
        { day: 30, level: 'high' },
      ],
    },
    approvals: [
      { id: 'ap-1', initials: 'AS', name: 'Amit Sharma', meta: 'Conveyance / \u20B92,400' },
      { id: 'ap-2', initials: 'RK', name: 'Rajesh Kumar', meta: 'Leave / 2 Days' },
      { id: 'ap-3', initials: 'PM', name: 'Priya Maurya', meta: 'Travel / Pune Cluster' },
    ],
    teamRows: [
      {
        id: 'tm-1',
        name: 'Amit Sharma',
        avatar: 'AS',
        department: 'Sales & Marketing',
        status: 'online',
        location: 'Nasik Mandi',
        tasks: '04 / 06',
        distanceKm: 42.5,
      },
      {
        id: 'tm-2',
        name: 'Rajesh Kumar',
        avatar: 'RK',
        department: 'Internal Audit',
        status: 'offline',
        location: 'Hadapsar Office',
        tasks: '02 / 02',
        distanceKm: 12.8,
      },
      {
        id: 'tm-3',
        name: 'Priya Maurya',
        avatar: 'PM',
        department: 'Research & Development',
        status: 'online',
        location: 'Latur Cluster',
        tasks: '05 / 08',
        distanceKm: 88.2,
      },
    ],
  }
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeManagerData(payload) {
  if (!payload) return null

  const summary = payload.summary ?? payload.kpis ?? {}
  const approvals = payload.approvals ?? payload.pending_approvals ?? []
  const teamRows = payload.team_status ?? payload.rows ?? []

  return {
    kpis: {
      teamTasks: safeNumber(summary.team_tasks ?? summary.total_tasks),
      taskGrowthPct: safeNumber(summary.task_growth_pct ?? summary.growth_pct),
      checkInsCompleted: safeNumber(summary.check_ins_completed ?? summary.checkins_done),
      checkInsTotal: safeNumber(summary.check_ins_total ?? summary.checkins_total),
      pendingApprovals: safeNumber(summary.pending_approvals ?? approvals.length),
      urgentApprovals: safeNumber(summary.urgent_approvals ?? 0),
      monthlyTravel: safeNumber(summary.monthly_travel ?? summary.travel_spend),
    },
    attendance: payload.attendance ?? buildMockManagerData().attendance,
    approvals: approvals.map((item, idx) => ({
      id: item.id ?? `approval-${idx}`,
      initials: item.initials ?? String(item.name ?? 'NA').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      name: item.name ?? item.staff_name ?? 'Unknown',
      meta: item.meta ?? item.reason ?? 'Pending approval',
    })),
    teamRows: teamRows.map((row, idx) => ({
      id: row.id ?? `team-${idx}`,
      name: row.name ?? row.staff_name ?? 'Unknown',
      avatar: row.avatar ?? String(row.name ?? row.staff_name ?? 'NA').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      department: row.department ?? '--',
      status: String(row.status ?? 'offline').toLowerCase(),
      location: row.location ?? row.last_location ?? '--',
      tasks: row.tasks ?? row.today_tasks ?? '--',
      distanceKm: safeNumber(row.distance_km ?? row.distance),
    })),
  }
}

async function fetchManagerDashboard() {
  try {
    const response = await apiClient.get('/api/v1/dashboard/manager')
    return normalizeManagerData(response.data) ?? buildMockManagerData()
  } catch {
    return buildMockManagerData()
  }
}

function attendanceDot(level) {
  if (level === 'high' || level === 'today') return 'bg-primary-container'
  if (level === 'mid') return 'bg-amber-500'
  if (level === 'low') return 'bg-error'
  return 'bg-transparent'
}

export default function ManagerDashboardPage() {
  const user = useAuthStore((store) => store.user)
  const [approvalRows, setApprovalRows] = useState(buildMockManagerData().approvals)

  const dashboardQuery = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: fetchManagerDashboard,
    placeholderData: (prev) => prev,
  })

  const dashboard = dashboardQuery.data ?? buildMockManagerData()
  const approvals = approvalRows.length ? approvalRows : dashboard.approvals

  const summary = dashboard.kpis
  const completionPct = summary.checkInsTotal > 0 ? (summary.checkInsCompleted / summary.checkInsTotal) * 100 : 0

  const rows = useMemo(() => {
    const source = dashboard.teamRows.length ? dashboard.teamRows : buildMockManagerData().teamRows
    return source
  }, [dashboard.teamRows])

  function dismissApproval(approvalId) {
    setApprovalRows((current) => current.filter((item) => item.id !== approvalId))
  }

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
              <span className="h-7 w-7 rounded-sm bg-surface-container-high text-on-surface text-[11px] font-bold inline-flex items-center justify-center">RM</span>
            </>
          }
        />
      }
    >
      <div className="max-w-6xl mx-auto space-y-4">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <article className="bg-surface-container-lowest border-l-4 border-primary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Team Tasks</p>
            <p className="text-5xl font-black font-headline mt-1">{summary.teamTasks}</p>
            <p className="text-xs text-primary mt-2">+{summary.taskGrowthPct}% from last week</p>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-secondary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Today's Check-ins</p>
            <p className="text-5xl font-black font-headline mt-1">
              {summary.checkInsCompleted}/{summary.checkInsTotal}
            </p>
            <div className="h-1 bg-surface-container mt-3">
              <div className="h-full bg-secondary" style={{ width: `${completionPct}%` }} />
            </div>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-tertiary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Pending Approvals</p>
            <p className="text-5xl font-black font-headline mt-1">{summary.pendingApprovals}</p>
            <p className="text-xs text-tertiary mt-2">{summary.urgentApprovals} urgent requests</p>
          </article>

          <article className="bg-surface-container-lowest border-l-4 border-primary-container px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Monthly Travel</p>
            <p className="text-4xl font-black font-headline mt-2">\u20B9{summary.monthlyTravel.toLocaleString('en-IN')}</p>
            <p className="text-xs text-on-surface-variant mt-2">Within budget limits</p>
          </article>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-3">
          <article className="bg-surface-container-lowest p-4">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h2 className="text-2xl font-black font-headline text-on-surface">Team Attendance Calendar - {dashboard.attendance.monthLabel}</h2>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary-container" /> {'>'}80%</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> 50-80%</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error" /> {'<'}50%</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="text-[10px] font-bold text-center text-on-surface-variant pb-1">{day}</div>
              ))}

              {dashboard.attendance.cells.map((cell) => (
                <div
                  key={cell.day}
                  className={`aspect-square border border-outline-variant/10 flex flex-col items-center justify-center relative text-xs font-semibold ${cell.level === 'today' ? 'bg-primary/5 border-primary' : 'bg-surface-container-lowest'}`}
                >
                  <span>{cell.day}</span>
                  <span className={`h-1.5 w-1.5 rounded-full mt-1 ${attendanceDot(cell.level)}`} />
                  {cell.level === 'today' ? (
                    <span className="absolute top-1 right-1 text-[8px] font-bold text-primary">TODAY</span>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="bg-surface-container-lowest p-4">
            <h2 className="text-2xl font-black font-headline text-on-surface mb-3">Pending Approvals</h2>
            <div className="space-y-2">
              {approvals.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No pending approvals.</p>
              ) : (
                approvals.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between gap-2 bg-surface-container-low p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-7 w-7 rounded-full bg-surface-container-high text-[10px] font-bold inline-flex items-center justify-center shrink-0">
                        {approval.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{approval.name}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">{approval.meta}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => dismissApproval(approval.id)}
                        className="h-6 w-6 inline-flex items-center justify-center border border-error/40 text-error text-xs"
                        aria-label={`Reject approval for ${approval.name}`}
                      >
                        x
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissApproval(approval.id)}
                        className="h-6 w-6 inline-flex items-center justify-center bg-primary text-on-primary text-xs"
                        aria-label={`Approve request for ${approval.name}`}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button type="button" className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">View all approvals</button>
          </article>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant/20">
          <div className="px-4 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-black font-headline text-on-surface">Team Status Overview - 2026</h2>
            <div className="flex items-center gap-2">
              <button type="button" className="h-7 px-3 bg-surface-container-low text-[10px] font-bold uppercase tracking-wider">Filter</button>
              <button type="button" className="h-7 px-3 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider">Export CSV</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full">
              <thead>
                <tr className="bg-surface-container-low text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  <th className="px-3 py-3 text-left">Staff Member</th>
                  <th className="px-3 py-3 text-left">Department</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Last Location</th>
                  <th className="px-3 py-3 text-left">Today's Tasks</th>
                  <th className="px-3 py-3 text-left">Distance</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-outline-variant/15">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-surface-container-high text-[10px] font-bold inline-flex items-center justify-center">{row.avatar}</span>
                        <span className="text-sm font-semibold">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-on-surface-variant">{row.department}</td>
                    <td className="px-3 py-3 text-xs font-semibold uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${row.status === 'online' ? 'bg-primary-container' : 'bg-outline-variant'}`} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-on-surface-variant">{row.location}</td>
                    <td className="px-3 py-3 text-sm font-semibold">{row.tasks}</td>
                    <td className="px-3 py-3 text-sm">{row.distanceKm.toFixed(1)} km</td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" className="text-xs font-bold uppercase tracking-wider text-primary">Assign Task</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
