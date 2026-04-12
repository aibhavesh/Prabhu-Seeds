import { useMemo } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { endOfMonth, format, getDaysInMonth, startOfMonth } from 'date-fns'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function attendanceColor(value) {
  if (value < 50) return '#ef4444'
  if (value < 70) return '#f59e0b'
  if (value < 90) return '#4caf50'
  return '#0d631b'
}

function HeatCell(props) {
  const { cx, cy, payload } = props
  const size = 22
  const x = cx - size / 2
  const y = cy - size / 2

  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={2} fill={attendanceColor(payload.attendancePct)} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">
        {payload.day}
      </text>
    </g>
  )
}

function toHeatmapCells(inputDays, monthDate) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const daysInMonth = getDaysInMonth(monthDate)

  const byDay = new Map()
  for (const item of inputDays ?? []) {
    const dateObj = item.date ? new Date(item.date) : null
    if (!dateObj || Number.isNaN(dateObj.getTime())) continue
    if (dateObj < monthStart || dateObj > monthEnd) continue

    byDay.set(dateObj.getDate(), Number(item.attendance_pct ?? item.attendancePct ?? 0))
  }

  const cells = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(monthDate.getFullYear(), monthDate.getMonth(), day)
    const weekday = (dateObj.getDay() + 6) % 7
    const week = Math.floor((day + ((monthStart.getDay() + 6) % 7) - 1) / 7)

    cells.push({
      day,
      dayOfWeek: weekday,
      week,
      attendancePct: byDay.get(day) ?? 0,
      z: 1,
    })
  }

  return cells
}

export default function AttendanceHeatmap({ days, monthDate, title = 'Team Attendance %' }) {
  const cells = useMemo(() => toHeatmapCells(days, monthDate), [days, monthDate])
  const maxWeek = Math.max(...cells.map((c) => c.week), 0)

  return (
    <div className="bg-surface-container-lowest shadow-ghost p-4" data-testid="attendance-heatmap">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">{title}</h3>
        <span className="text-xs font-medium text-on-surface-variant">{format(monthDate, 'MMMM yyyy')}</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="#e5e9e6" />
            <XAxis
              type="number"
              dataKey="dayOfWeek"
              ticks={[0, 1, 2, 3, 4, 5, 6]}
              domain={[0, 6]}
              tickFormatter={(value) => WEEKDAY_LABELS[value]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#40493d', fontWeight: 700 }}
            />
            <YAxis
              type="number"
              dataKey="week"
              domain={[0, maxWeek]}
              tickCount={maxWeek + 1}
              tickFormatter={() => ''}
              tickLine={false}
              axisLine={false}
            />
            <ZAxis type="number" dataKey="z" range={[300, 300]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                if (name === 'attendancePct') return [`${value}%`, 'Attendance']
                return [value, name]
              }}
              labelFormatter={(_, payload) => {
                const day = payload?.[0]?.payload?.day
                return day ? `Day ${day}` : 'Attendance'
              }}
            />
            <Scatter data={cells} dataKey="attendancePct" shape={HeatCell} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 pt-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 bg-[#ef4444]" /> &lt;50%</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 bg-[#f59e0b]" /> 50-70%</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 bg-[#4caf50]" /> 70-90%</span>
        <span className="inline-flex items-center gap-1"><i className="h-2 w-2 bg-[#0d631b]" /> &gt;90%</span>
      </div>
    </div>
  )
}
