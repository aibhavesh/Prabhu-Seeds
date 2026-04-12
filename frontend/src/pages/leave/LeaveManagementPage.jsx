import { useMemo } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import LeaveShell from './components/LeaveShell'
import LeaveStatusBadge from './components/LeaveStatusBadge'
import { LeavePanelSkeleton } from './components/LeaveSkeleton'
import { usePendingLeaveRequests, useReviewLeaveRequest, useTeamLeaveBalances, useTeamLeaves } from './hooks/useLeaves'
import { useAuthStore } from '@/store/authStore'

const leaveRangeSchema = z
  .object({
    fromDate: z.string().min(1, 'From date is required'),
    toDate: z.string().min(1, 'To date is required'),
  })
  .refine((values) => values.toDate >= values.fromDate, {
    path: ['toDate'],
    message: 'To date must be after from date',
  })

function formatInputDate(date) {
  return format(date, 'yyyy-MM-dd')
}

function getDefaultRange() {
  const now = new Date()
  return {
    fromDate: formatInputDate(startOfMonth(now)),
    toDate: formatInputDate(endOfMonth(now)),
  }
}

function normalizeLeaves(payload) {
  const rows = payload?.leaves ?? payload?.items ?? payload?.data ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    id: row.id ?? row.leave_id ?? `leave-${idx}`,
    staffName: row.staff_name ?? row.user_name ?? row.employee_name ?? 'Unknown staff',
    staffRole: row.staff_role ?? row.role ?? 'Field Staff',
    fromDate: row.from_date ?? row.start_date ?? row.from ?? row.date,
    toDate: row.to_date ?? row.end_date ?? row.to ?? row.date,
    leaveType: String(row.leave_type ?? row.type ?? 'casual').toLowerCase(),
    reason: row.reason ?? row.note ?? 'No reason provided',
    durationDays: Number(row.duration_days ?? row.days ?? 1),
    status: String(row.status ?? 'pending').toLowerCase(),
  }))
}

function readBalance(entry, key) {
  const nested = entry?.[key]

  if (nested && typeof nested === 'object') {
    return {
      used: Number(nested.used ?? nested.taken ?? 0),
      total: Number(nested.total ?? nested.available ?? nested.limit ?? 0),
    }
  }

  return {
    used: Number(entry?.[`${key}_used`] ?? 0),
    total: Number(entry?.[`${key}_total`] ?? entry?.[`${key}_available`] ?? 0),
  }
}

function normalizeStaffBalances(payload) {
  const rows = payload?.balances ?? payload?.staff_balances ?? payload?.items ?? payload?.data ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    id: row.id ?? row.staff_id ?? `staff-${idx}`,
    staffName: row.staff_name ?? row.name ?? `Staff ${idx + 1}`,
    casual: readBalance(row, 'casual'),
    medical: readBalance(row, 'medical'),
    earned: readBalance(row, 'earned'),
  }))
}

function leaveTypeClass(type) {
  if (type === 'medical') return 'bg-cyan-500/60'
  if (type === 'earned') return 'bg-amber-500/70'
  return 'bg-emerald-600/70'
}

function CalendarCell({ day, monthStart, leaves }) {
  const activeLeaves = leaves.filter((leave) => {
    if (!leave.fromDate || !leave.toDate) return false

    const start = parseISO(String(leave.fromDate))
    const end = parseISO(String(leave.toDate))

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false

    return isWithinInterval(day, { start, end })
  })

  return (
    <div className={`min-h-[86px] border border-outline-variant/10 p-2 ${isSameMonth(day, monthStart) ? 'bg-surface-container-lowest' : 'bg-surface-container-low/50 text-on-surface-variant/60'}`}>
      <p className="text-xs font-semibold">{format(day, 'd')}</p>
      <div className="mt-2 space-y-1">
        {activeLeaves.slice(0, 2).map((leave) => (
          <div key={`${leave.id}-${leave.leaveType}`} className={`h-1.5 w-full rounded-sm ${leaveTypeClass(leave.leaveType)}`} title={`${leave.staffName} - ${leave.leaveType}`} />
        ))}
        {activeLeaves.length > 2 && (
          <p className="text-[10px] text-on-surface-variant font-semibold">+{activeLeaves.length - 2}</p>
        )}
      </div>
    </div>
  )
}

export default function LeaveManagementPage() {
  const user = useAuthStore((s) => s.user)
  const allowed = user?.role === 'owner' || user?.role === 'manager'

  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(leaveRangeSchema),
    defaultValues: getDefaultRange(),
  })

  const watchedRange = useWatch({ control })
  const fromDate = watchedRange?.fromDate ?? getDefaultRange().fromDate
  const toDate = watchedRange?.toDate ?? getDefaultRange().toDate

  const leavesQuery = useTeamLeaves({ from: fromDate, to: toDate })
  const pendingQuery = usePendingLeaveRequests({ from: fromDate, to: toDate })
  const balancesQuery = useTeamLeaveBalances({ from: fromDate, to: toDate })
  const reviewLeave = useReviewLeaveRequest()

  const teamLeaves = useMemo(() => normalizeLeaves(leavesQuery.data), [leavesQuery.data])
  const pendingLeaves = useMemo(
    () => normalizeLeaves(pendingQuery.data).filter((row) => row.status === 'pending'),
    [pendingQuery.data]
  )
  const balances = useMemo(() => normalizeStaffBalances(balancesQuery.data), [balancesQuery.data])

  const monthBase = useMemo(() => {
    const parsed = parseISO(fromDate)
    if (Number.isNaN(parsed.getTime())) return startOfMonth(new Date())
    return startOfMonth(parsed)
  }, [fromDate])

  const monthStart = startOfMonth(monthBase)
  const monthEnd = endOfMonth(monthBase)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function moveMonth(step) {
    const shifted = addMonths(monthBase, step)
    setValue('fromDate', formatInputDate(startOfMonth(shifted)), { shouldDirty: true, shouldValidate: true })
    setValue('toDate', formatInputDate(endOfMonth(shifted)), { shouldDirty: true, shouldValidate: true })
  }

  async function handleDecision(leaveId, decision) {
    try {
      await toast.promise(reviewLeave.mutateAsync({ leaveId, decision }), {
        loading: `${decision === 'approved' ? 'Approving' : 'Rejecting'} leave request...`,
        success: `Request ${decision}.`,
        error: 'Could not update request.',
      })
    } catch {
      // Toast already displayed
    }
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-surface-container-lowest shadow-ghost p-6 text-center max-w-md">
          <h1 className="text-2xl font-black font-headline text-on-surface">Access Restricted</h1>
          <p className="text-on-surface-variant mt-2">Leave management is available for manager and owner roles only.</p>
        </div>
      </div>
    )
  }

  return (
    <LeaveShell
      title="Leave Management"
      subtitle="Review team time-off schedules, approvals, and balances."
      rightSlot={
        <button
          type="button"
          onClick={() => {
            if (!teamLeaves.length) return
            const header = ['Staff Name', 'Type', 'From', 'To', 'Days', 'Status', 'Reason']
            const lines = teamLeaves.map((r) =>
              [r.staffName, r.leaveType, r.fromDate, r.toDate, r.durationDays, r.status, r.reason]
                .map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`)
                .join(',')
            )
            const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `leave-report-${fromDate}-to-${toDate}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="h-9 px-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
          Export Report
        </button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4">
        <section className="bg-surface-container-lowest shadow-ghost p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-2xl font-black font-headline text-on-surface">Team Leave Calendar</h2>
              <p className="text-sm text-on-surface-variant mt-1">Date range calendar with active leave overlays.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                {...register('fromDate')}
                aria-label="From date"
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold"
              />
              <input
                type="date"
                {...register('toDate')}
                aria-label="To date"
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold"
              />
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="h-9 w-9 bg-surface-container-low border border-outline-variant/20 inline-flex items-center justify-center"
                aria-label="Previous month"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="h-9 w-9 bg-surface-container-low border border-outline-variant/20 inline-flex items-center justify-center"
                aria-label="Next month"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </div>

          {(errors.fromDate || errors.toDate) && (
            <p className="mt-2 text-xs text-error">{errors.fromDate?.message ?? errors.toDate?.message}</p>
          )}

          <div className="mt-4 inline-flex bg-surface-container-low px-3 py-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {format(monthBase, 'MMMM yyyy')}
          </div>

          {(leavesQuery.isLoading && !leavesQuery.data) ? (
            <LeavePanelSkeleton rows={6} testId="leave-calendar-skeleton" />
          ) : (
            <>
              <div className="mt-4 grid grid-cols-7 gap-0">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="bg-surface-container-low px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/10">
                    {day}
                  </div>
                ))}

                {monthDays.map((day) => (
                  <CalendarCell key={day.toISOString()} day={day} monthStart={monthStart} leaves={teamLeaves} />
                ))}
              </div>

              <div className="mt-4 flex items-center gap-4 flex-wrap text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-emerald-600/70" /> Earned Leave</span>
                <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-cyan-500/60" /> Medical Leave</span>
                <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-amber-500/70" /> Casual Leave</span>
              </div>
            </>
          )}
        </section>

        <div className="space-y-4">
          <section className="bg-surface-container-lowest shadow-ghost p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-2xl font-black font-headline text-on-surface">Pending Requests</h2>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-widest">
                {pendingLeaves.length} New
              </span>
            </div>

            {(pendingQuery.isLoading && !pendingQuery.data) ? (
              <LeavePanelSkeleton rows={3} testId="leave-pending-skeleton" />
            ) : (
              <div className="space-y-3">
                {pendingLeaves.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No pending leave requests.</p>
                ) : (
                  pendingLeaves.map((leave) => (
                    <article key={leave.id} className="border border-outline-variant/15 bg-surface-container-low px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-on-surface text-sm">{leave.staffName}</p>
                          <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">{leave.staffRole}</p>
                        </div>
                        <LeaveStatusBadge value={leave.leaveType} kind="type" />
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                        <p><span className="font-bold">Dates:</span> {leave.fromDate} to {leave.toDate}</p>
                        <p><span className="font-bold">Duration:</span> {leave.durationDays} day(s)</p>
                      </div>

                      <p className="mt-1 text-xs italic text-on-surface-variant">"{leave.reason}"</p>

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(leave.id, 'rejected')}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-rose-600 text-white"
                          disabled={reviewLeave.isPending}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(leave.id, 'approved')}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-primary text-on-primary"
                          disabled={reviewLeave.isPending}
                        >
                          Approve
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="bg-surface-container-lowest shadow-ghost p-4 sm:p-5">
            <h2 className="text-2xl font-black font-headline text-on-surface mb-3">Staff Leave Balances</h2>

            {(balancesQuery.isLoading && !balancesQuery.data) ? (
              <LeavePanelSkeleton rows={3} testId="leave-balances-skeleton" />
            ) : (
              <div className="space-y-2">
                {balances.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No staff balance data found.</p>
                ) : (
                  balances.map((staff) => (
                    <article key={staff.id} className="border border-outline-variant/15 px-3 py-3 bg-surface-container-low">
                      <p className="font-bold text-on-surface text-sm">{staff.staffName}</p>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                        <div>
                          <p className="uppercase tracking-widest text-on-surface-variant">Earned</p>
                          <p className="font-bold text-emerald-700">{staff.earned.used}/{staff.earned.total}</p>
                        </div>
                        <div>
                          <p className="uppercase tracking-widest text-on-surface-variant">Medical</p>
                          <p className="font-bold text-cyan-700">{staff.medical.used}/{staff.medical.total}</p>
                        </div>
                        <div>
                          <p className="uppercase tracking-widest text-on-surface-variant">Casual</p>
                          <p className="font-bold text-amber-700">{staff.casual.used}/{staff.casual.total}</p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </LeaveShell>
  )
}
