import { useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import generatePDF from 'react-to-pdf'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import apiClient from '@/lib/axios'
import NotificationBell from '@/features/notifications/NotificationBell'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard/owner', available: true },
  { label: 'Tasks', icon: 'task', to: '/tasks', available: true },
  { label: 'Attendance', icon: 'calendar_month', to: '/attendance', available: true },
  { label: 'Travel', icon: 'flight_takeoff', to: '/travel', available: true },
  { label: 'Live Tracking', icon: 'location_on', to: '/tracking/live', available: true },
  { label: 'Analytics', icon: 'monitoring', available: false },
  { label: 'Dealers', icon: 'storefront', available: false },
  { label: 'Settings', icon: 'settings', available: false },
]

const STATE_SHAPES = [
  { code: 'PB', name: 'Punjab', points: '140,70 165,70 172,90 145,95' },
  { code: 'RJ', name: 'Rajasthan', points: '110,95 165,92 180,145 135,175 95,145' },
  { code: 'UP', name: 'Uttar Pradesh', points: '175,92 245,95 258,125 188,130 170,108' },
  { code: 'BR', name: 'Bihar', points: '258,103 294,108 300,130 262,132' },
  { code: 'GJ', name: 'Gujarat', points: '84,150 133,176 130,224 92,228 72,188' },
  { code: 'MP', name: 'Madhya Pradesh', points: '140,145 208,136 220,178 150,196 130,174' },
  { code: 'MH', name: 'Maharashtra', points: '116,198 188,186 208,232 136,262 94,224' },
  { code: 'CT', name: 'Chhattisgarh', points: '220,168 258,168 267,214 226,221 210,188' },
  { code: 'WB', name: 'West Bengal', points: '300,128 326,132 334,178 309,184 294,150' },
  { code: 'OD', name: 'Odisha', points: '268,178 303,183 306,222 270,226 258,202' },
  { code: 'TS', name: 'Telangana', points: '208,232 238,228 246,256 216,264' },
  { code: 'AP', name: 'Andhra Pradesh', points: '236,227 282,228 293,294 252,316 228,280' },
  { code: 'KA', name: 'Karnataka', points: '154,264 211,252 220,308 176,338 144,304' },
  { code: 'TN', name: 'Tamil Nadu', points: '196,338 231,326 239,370 203,388 180,366' },
  { code: 'KL', name: 'Kerala', points: '164,304 178,338 171,381 150,364 148,320' },
]

const STATE_CODE_BY_NAME = {
  punjab: 'PB',
  rajasthan: 'RJ',
  'uttar pradesh': 'UP',
  bihar: 'BR',
  gujarat: 'GJ',
  'madhya pradesh': 'MP',
  maharashtra: 'MH',
  chhattisgarh: 'CT',
  'west bengal': 'WB',
  odisha: 'OD',
  telangana: 'TS',
  'andhra pradesh': 'AP',
  karnataka: 'KA',
  'tamil nadu': 'TN',
  kerala: 'KL',
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function formatInr(value) {
  return `\u20B9${Math.round(safeNumber(value)).toLocaleString('en-IN')}`
}

function formatInputDate(date) {
  return format(date, 'yyyy-MM-dd')
}

function getCurrentMonthRange() {
  const now = new Date()
  return {
    fromDate: formatInputDate(startOfMonth(now)),
    toDate: formatInputDate(endOfMonth(now)),
  }
}

function getPreviousRange(fromDate, toDate) {
  const from = parseISO(fromDate)
  const to = parseISO(toDate)
  return {
    fromDate: formatInputDate(subMonths(from, 1)),
    toDate: formatInputDate(subMonths(to, 1)),
  }
}

function resolveStateCode(row) {
  if (row?.state_code) return String(row.state_code).toUpperCase()
  if (row?.code) return String(row.code).toUpperCase()

  const name = String(row?.state_name ?? row?.state ?? '').trim().toLowerCase()
  return STATE_CODE_BY_NAME[name] ?? null
}

function normalizeStateMetrics(rows) {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => {
      const code = resolveStateCode(row)
      if (!code) return null

      return {
        code,
        name: row.state_name ?? row.state ?? code,
        completionPct: safeNumber(row.completion_pct ?? row.completionPct ?? row.task_completion_pct, 0),
        tasks: safeNumber(row.tasks ?? row.total_tasks ?? row.task_count, 0),
        attendancePct: safeNumber(row.attendance_pct ?? row.attendancePct ?? row.avg_attendance_pct, 0),
        travelSpend: safeNumber(row.travel_spend ?? row.expenses ?? row.travelSpend, 0),
      }
    })
    .filter(Boolean)
}

function normalizeDepartments(rows) {
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    id: row.id ?? `department-${idx}`,
    department: row.department ?? row.name ?? `Dept ${idx + 1}`,
    tasks: safeNumber(row.tasks ?? row.total_tasks, 0),
    attendance: safeNumber(row.attendance ?? row.avg_attendance ?? row.attendance_score, 0),
    expenses: safeNumber(row.expenses ?? row.travel_spend ?? row.spend, 0),
  }))
}

function normalizePerformers(rows) {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row, idx) => ({
      id: row.id ?? row.user_id ?? `performer-${idx}`,
      name: row.name ?? row.staff_name ?? row.user_name ?? 'Unknown',
      department: row.department ?? row.dept ?? '--',
      state: row.state ?? row.region ?? '--',
      score: safeNumber(row.score ?? row.performance_score ?? row.completion_pct, 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

function normalizeOwnerDashboard(payload) {
  const summaryRaw = payload?.summary ?? payload?.kpis ?? {}
  const states = normalizeStateMetrics(payload?.state_wise ?? payload?.states ?? payload?.map_data)
  const departments = normalizeDepartments(payload?.department_performance ?? payload?.departments ?? payload?.teams)
  const topPerformers = normalizePerformers(payload?.top_performers ?? payload?.leaderboard ?? payload?.performers)

  const summary = {
    totalTasks: safeNumber(summaryRaw.total_tasks ?? summaryRaw.totalTasks, 0),
    completionPct: safeNumber(summaryRaw.completion_pct ?? summaryRaw.completionPct, 0),
    avgAttendancePct: safeNumber(summaryRaw.avg_attendance_pct ?? summaryRaw.avgAttendancePct, 0),
    travelSpend: safeNumber(summaryRaw.travel_spend ?? summaryRaw.travelSpend, 0),
    pendingApprovals: safeNumber(summaryRaw.pending_approvals ?? summaryRaw.pendingApprovals, 0),
  }

  const hasAnyData =
    summary.totalTasks > 0 ||
    summary.completionPct > 0 ||
    summary.avgAttendancePct > 0 ||
    summary.travelSpend > 0 ||
    summary.pendingApprovals > 0 ||
    states.length > 0 ||
    departments.length > 0 ||
    topPerformers.length > 0

  if (!hasAnyData) return null

  return {
    summary,
    states,
    departments,
    topPerformers,
  }
}

function buildMockOwnerDashboard() {
  const states = [
    { code: 'RJ', name: 'Rajasthan', completionPct: 78, tasks: 248, attendancePct: 90, travelSpend: 89400 },
    { code: 'UP', name: 'Uttar Pradesh', completionPct: 84, tasks: 312, attendancePct: 92, travelSpend: 101300 },
    { code: 'MP', name: 'Madhya Pradesh', completionPct: 82, tasks: 276, attendancePct: 91, travelSpend: 96400 },
    { code: 'MH', name: 'Maharashtra', completionPct: 86, tasks: 298, attendancePct: 93, travelSpend: 118500 },
    { code: 'GJ', name: 'Gujarat', completionPct: 81, tasks: 258, attendancePct: 90, travelSpend: 87100 },
    { code: 'CT', name: 'Chhattisgarh', completionPct: 79, tasks: 198, attendancePct: 89, travelSpend: 65200 },
    { code: 'WB', name: 'West Bengal', completionPct: 80, tasks: 206, attendancePct: 88, travelSpend: 71400 },
    { code: 'OD', name: 'Odisha', completionPct: 76, tasks: 182, attendancePct: 87, travelSpend: 59800 },
    { code: 'TS', name: 'Telangana', completionPct: 88, tasks: 221, attendancePct: 94, travelSpend: 73900 },
    { code: 'AP', name: 'Andhra Pradesh', completionPct: 83, tasks: 233, attendancePct: 91, travelSpend: 81200 },
    { code: 'KA', name: 'Karnataka', completionPct: 85, tasks: 242, attendancePct: 92, travelSpend: 87400 },
    { code: 'TN', name: 'Tamil Nadu', completionPct: 87, tasks: 246, attendancePct: 93, travelSpend: 84100 },
    { code: 'KL', name: 'Kerala', completionPct: 82, tasks: 169, attendancePct: 90, travelSpend: 56300 },
    { code: 'PB', name: 'Punjab', completionPct: 80, tasks: 187, attendancePct: 88, travelSpend: 60500 },
    { code: 'BR', name: 'Bihar', completionPct: 75, tasks: 201, attendancePct: 86, travelSpend: 62200 },
  ]

  return {
    summary: {
      totalTasks: 1247,
      completionPct: 78.4,
      avgAttendancePct: 91.2,
      travelSpend: 482350,
      pendingApprovals: 23,
    },
    states,
    departments: [
      { id: 'd1', department: 'Marketing', tasks: 88, attendance: 85, expenses: 122500 },
      { id: 'd2', department: 'Production', tasks: 91, attendance: 89, expenses: 105200 },
      { id: 'd3', department: 'R&D', tasks: 74, attendance: 81, expenses: 145900 },
      { id: 'd4', department: 'Processing', tasks: 62, attendance: 77, expenses: 108400 },
      { id: 'd5', department: 'Logistics', tasks: 81, attendance: 83, expenses: 132700 },
    ],
    topPerformers: [
      { id: 'p1', name: 'Rajesh Kumar', department: 'Marketing', state: 'Madhya Pradesh', score: 96 },
      { id: 'p2', name: 'Amit Sharma', department: 'Production', state: 'Rajasthan', score: 92 },
      { id: 'p3', name: 'Priya Verma', department: 'R&D', state: 'Gujarat', score: 87 },
      { id: 'p4', name: 'Neha Gupta', department: 'Processing', state: 'Uttar Pradesh', score: 85 },
      { id: 'p5', name: 'Vikram Singh', department: 'Logistics', state: 'Maharashtra', score: 82 },
      { id: 'p6', name: 'Sana Qureshi', department: 'Marketing', state: 'Punjab', score: 80 },
      { id: 'p7', name: 'Kiran Reddy', department: 'Production', state: 'Telangana', score: 79 },
      { id: 'p8', name: 'Anjali Das', department: 'R&D', state: 'West Bengal', score: 78 },
      { id: 'p9', name: 'Rohit Patil', department: 'Logistics', state: 'Karnataka', score: 76 },
      { id: 'p10', name: 'Meena Iyer', department: 'Processing', state: 'Tamil Nadu', score: 75 },
    ],
  }
}

async function fetchOwnerDashboard({ fromDate, toDate }) {
  try {
    const response = await apiClient.get('/api/v1/dashboard/owner', {
      params: { from: fromDate, to: toDate },
    })

    return normalizeOwnerDashboard(response.data) ?? buildMockOwnerDashboard()
  } catch {
    return buildMockOwnerDashboard()
  }
}

function calcTrend(current, previous, { invert = false } = {}) {
  const curr = safeNumber(current)
  const prev = safeNumber(previous)

  if (curr === prev) {
    return { direction: 'flat', deltaPct: 0, positive: true }
  }

  if (prev === 0) {
    const positive = invert ? curr <= prev : curr >= prev
    return { direction: curr > prev ? 'up' : 'down', deltaPct: 100, positive }
  }

  const deltaPct = Math.abs(((curr - prev) / prev) * 100)
  const direction = curr > prev ? 'up' : 'down'
  const positive = invert ? curr < prev : curr > prev

  return { direction, deltaPct, positive }
}

function completionFill(completionPct) {
  const clamped = Math.max(0, Math.min(100, safeNumber(completionPct)))
  const lightness = 86 - clamped * 0.42
  return `hsl(133 48% ${lightness}%)`
}

function DashboardSidebarItem({ item }) {
  const base = 'group flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors'

  if (!item.available) {
    return (
      <div className={`${base} text-on-surface-variant opacity-60 cursor-not-allowed`}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `${base} ${isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface'}`
      }
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

function KpiCard({ label, value, trend, accent }) {
  const trendIcon = trend.direction === 'up' ? 'north' : trend.direction === 'down' ? 'south' : 'remove'

  return (
    <article className="bg-surface-container-lowest shadow-ghost px-4 py-4 relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: accent }} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="text-3xl md:text-[2rem] font-black font-headline mt-1 text-on-surface">{value}</p>
      <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${trend.positive ? 'text-emerald-700' : 'text-error'}`}>
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{trendIcon}</span>
        {trend.deltaPct.toFixed(1)}% vs last month
      </div>
    </article>
  )
}

function KpiSkeleton() {
  return (
    <article className="bg-surface-container-lowest shadow-ghost px-4 py-4 animate-pulse">
      <div className="h-3 w-28 bg-surface-container-low" />
      <div className="h-10 w-32 bg-surface-container-low mt-3" />
      <div className="h-4 w-24 bg-surface-container-low mt-3" />
    </article>
  )
}

function ChartSkeleton({ className = '' }) {
  return (
    <div className={`bg-surface-container-lowest shadow-ghost p-4 animate-pulse ${className}`}>
      <div className="h-4 w-44 bg-surface-container-low" />
      <div className="h-[280px] w-full bg-surface-container-low mt-4" />
    </div>
  )
}

function IndiaStateMap({ states }) {
  const [tooltip, setTooltip] = useState(null)
  const stateLookup = useMemo(() => {
    const map = new Map()
    states.forEach((row) => map.set(String(row.code).toUpperCase(), row))
    return map
  }, [states])

  return (
    <div className="relative w-full h-[340px] sm:h-[380px]">
      <svg
        viewBox="0 0 380 420"
        className="h-full w-full bg-surface-container-low/30"
        onMouseLeave={() => setTooltip(null)}
        role="img"
        aria-label="India state completion map"
      >
        <rect x="0" y="0" width="380" height="420" fill="#f7faf8" />

        {STATE_SHAPES.map((shape) => {
          const row = stateLookup.get(shape.code) ?? {
            code: shape.code,
            name: shape.name,
            completionPct: 0,
            tasks: 0,
            attendancePct: 0,
            travelSpend: 0,
          }

          return (
            <polygon
              key={shape.code}
              points={shape.points}
              fill={completionFill(row.completionPct)}
              stroke="#d6e1d9"
              strokeWidth="1.5"
              className="transition-opacity"
              onMouseMove={(event) => {
                const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect()
                const x = event.clientX - rect.left + 8
                const y = event.clientY - rect.top + 8

                setTooltip({
                  x,
                  y,
                  state: row,
                })
              }}
            />
          )
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 min-w-[190px] bg-surface-container-lowest border border-outline-variant/30 shadow-ghost p-3 text-xs"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-black text-on-surface">{tooltip.state.name}</p>
          <p className="text-on-surface-variant mt-1">Completion: {tooltip.state.completionPct.toFixed(1)}%</p>
          <p className="text-on-surface-variant">Tasks: {Math.round(tooltip.state.tasks)}</p>
          <p className="text-on-surface-variant">Attendance: {tooltip.state.attendancePct.toFixed(1)}%</p>
          <p className="text-on-surface-variant">Spend: {formatInr(tooltip.state.travelSpend)}</p>
        </div>
      )}
    </div>
  )
}

function DepartmentTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/25 p-2 shadow-ghost text-xs">
      <p className="font-bold text-on-surface mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.dataKey === 'expenses' ? formatInr(entry.value) : Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function OwnerDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const allowed = user?.role === 'owner'

  const monthDefaults = useMemo(() => getCurrentMonthRange(), [])
  const [fromDate, setFromDate] = useState(monthDefaults.fromDate)
  const [toDate, setToDate] = useState(monthDefaults.toDate)

  const dashboardRef = useRef(null)

  const previousRange = useMemo(() => getPreviousRange(fromDate, toDate), [fromDate, toDate])

  const dashboardQuery = useQuery({
    queryKey: ['owner-dashboard', fromDate, toDate],
    queryFn: () => fetchOwnerDashboard({ fromDate, toDate }),
    placeholderData: (previous) => previous,
  })

  const previousMonthQuery = useQuery({
    queryKey: ['owner-dashboard', previousRange.fromDate, previousRange.toDate],
    queryFn: () => fetchOwnerDashboard({ fromDate: previousRange.fromDate, toDate: previousRange.toDate }),
    placeholderData: (previous) => previous,
  })

  const dashboard = dashboardQuery.data ?? buildMockOwnerDashboard()
  const previousSummary = previousMonthQuery.data?.summary ?? buildMockOwnerDashboard().summary

  const kpis = useMemo(
    () => [
      {
        label: 'Total Tasks',
        value: Math.round(dashboard.summary.totalTasks).toLocaleString('en-IN'),
        trend: calcTrend(dashboard.summary.totalTasks, previousSummary.totalTasks),
        accent: '#2f8f3f',
      },
      {
        label: 'Completion %',
        value: `${dashboard.summary.completionPct.toFixed(1)}%`,
        trend: calcTrend(dashboard.summary.completionPct, previousSummary.completionPct),
        accent: '#1b6f89',
      },
      {
        label: 'Avg Attendance %',
        value: `${dashboard.summary.avgAttendancePct.toFixed(1)}%`,
        trend: calcTrend(dashboard.summary.avgAttendancePct, previousSummary.avgAttendancePct),
        accent: '#3b8e6a',
      },
      {
        label: 'Travel Spend',
        value: formatInr(dashboard.summary.travelSpend),
        trend: calcTrend(dashboard.summary.travelSpend, previousSummary.travelSpend, { invert: true }),
        accent: '#8b5a1f',
      },
      {
        label: 'Pending Approvals',
        value: String(Math.round(dashboard.summary.pendingApprovals)),
        trend: calcTrend(dashboard.summary.pendingApprovals, previousSummary.pendingApprovals, { invert: true }),
        accent: '#7b4f16',
      },
    ],
    [dashboard.summary, previousSummary]
  )

  function onFromDateChange(nextDate) {
    if (!nextDate) return
    if (nextDate > toDate) {
      setToDate(nextDate)
    }
    setFromDate(nextDate)
  }

  function onToDateChange(nextDate) {
    if (!nextDate) return
    if (nextDate < fromDate) {
      setFromDate(nextDate)
    }
    setToDate(nextDate)
  }

  function handlePdfExport() {
    generatePDF(dashboardRef, {
      filename: `owner-board-report-${fromDate}-to-${toDate}.pdf`,
      method: 'save',
      page: { margin: 12, format: 'A4', orientation: 'landscape' },
    })
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-surface-container-lowest shadow-ghost p-6 text-center max-w-md">
          <h1 className="text-2xl font-black font-headline text-on-surface">Access Restricted</h1>
          <p className="text-on-surface-variant mt-2">Owner dashboard is available only for Owner role.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:flex lg:flex-col bg-surface-container-low border-r border-outline-variant/20">
          <div className="px-6 py-6 border-b border-outline-variant/20">
            <p className="text-xl font-black font-headline text-primary leading-none">Prabhu Seeds</p>
            <p className="text-[10px] mt-2 font-bold uppercase tracking-[0.2em] text-on-surface-variant">Agritask Platform</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <DashboardSidebarItem key={item.label} item={item} />
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-outline-variant/20">
            <div className="bg-surface-container-lowest border border-outline-variant/15 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">System Status</p>
              <p className="text-xs text-on-surface-variant mt-1">Last synced 2m ago</p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex flex-col">
          <header className="h-auto min-h-14 bg-surface-container-lowest border-b border-outline-variant/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
              <span className="font-bold text-primary whitespace-nowrap">PGA AgriTask / Dashboard</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => onFromDateChange(event.target.value)}
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold"
                aria-label="From date"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => onToDateChange(event.target.value)}
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold"
                aria-label="To date"
              />
              <button
                type="button"
                onClick={handlePdfExport}
                className="h-9 px-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
                Export PDF
              </button>
              <NotificationBell />
              <span className="h-8 w-8 rounded-full bg-primary-container text-on-primary text-xs font-bold inline-flex items-center justify-center" aria-label="Profile">
                OW
              </span>
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 py-6 space-y-6" ref={dashboardRef}>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {(dashboardQuery.isLoading && !dashboardQuery.data)
                ? Array.from({ length: 5 }).map((_, idx) => <KpiSkeleton key={idx} />)
                : kpis.map((item) => (
                    <KpiCard
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      trend={item.trend}
                      accent={item.accent}
                    />
                  ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
              {(dashboardQuery.isLoading && !dashboardQuery.data) ? (
                <ChartSkeleton />
              ) : (
                <article className="bg-surface-container-lowest shadow-ghost p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-black font-headline text-on-surface">State-wise Performance</h2>
                      <p className="text-xs text-on-surface-variant">Hover a state to inspect completion and spend.</p>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Coverage: {dashboard.states.length} states</p>
                  </div>
                  <IndiaStateMap states={dashboard.states} />
                </article>
              )}

              {(dashboardQuery.isLoading && !dashboardQuery.data) ? (
                <ChartSkeleton />
              ) : (
                <article className="bg-surface-container-lowest shadow-ghost p-4 sm:p-5">
                  <div className="mb-4">
                    <h2 className="text-lg font-black font-headline text-on-surface">Department Performance</h2>
                    <p className="text-xs text-on-surface-variant">Tasks vs attendance vs expenses.</p>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.departments} margin={{ top: 12, right: 6, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dde8df" />
                        <XAxis dataKey="department" tick={{ fill: '#4f6659', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#4f6659', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<DepartmentTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="tasks" name="Tasks" fill="#2f8f3f" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="attendance" name="Attendance" fill="#1a6f86" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="#9b6a1e" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              )}
            </section>

            {(dashboardQuery.isLoading && !dashboardQuery.data) ? (
              <ChartSkeleton className="min-h-[320px]" />
            ) : (
              <section className="bg-surface-container-lowest shadow-ghost overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-black font-headline text-on-surface">Top 10 Performers</h2>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Leaderboard</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-surface-container-high border-b border-outline-variant/20">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Rank</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Name</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Department</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">State</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {dashboard.topPerformers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                            No performers available for selected date range.
                          </td>
                        </tr>
                      ) : (
                        dashboard.topPerformers.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-surface-container-low/50">
                            <td className="px-4 py-3 text-sm font-bold text-on-surface">{String(idx + 1).padStart(2, '0')}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-on-surface">{row.name}</td>
                            <td className="px-4 py-3 text-sm text-on-surface-variant">{row.department}</td>
                            <td className="px-4 py-3 text-sm text-on-surface-variant">{row.state}</td>
                            <td className="px-4 py-3 text-sm font-bold text-primary">{row.score.toFixed(0)}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
