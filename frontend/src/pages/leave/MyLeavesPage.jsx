import { useMemo, useState } from 'react'
import { format, startOfMonth } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import LeaveShell from './components/LeaveShell'
import LeaveStatusBadge from './components/LeaveStatusBadge'
import { LeaveCardSkeleton, LeavePanelSkeleton } from './components/LeaveSkeleton'
import { useApplyLeave, useMyLeaveBalances, useMyLeaveHistory } from './hooks/useLeaves'
import { useAuthStore } from '@/store/authStore'

const APPLY_LEAVE_SCHEMA = z
  .object({
    fromDate: z.string().min(1, 'From date is required'),
    toDate: z.string().min(1, 'To date is required'),
    leaveType: z
      .string()
      .min(1, 'Leave type is required')
      .refine((value) => ['casual', 'medical', 'earned'].includes(value), 'Choose a valid leave type'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(300, 'Reason cannot exceed 300 characters'),
  })
  .refine((values) => values.toDate >= values.fromDate, {
    path: ['toDate'],
    message: 'To date must be after from date',
  })

function formatInputDate(date) {
  return format(date, 'yyyy-MM-dd')
}

function normalizeBalances(payload) {
  const source = payload?.balances ?? payload?.summary ?? payload?.data ?? payload ?? {}

  function readBucket(name) {
    const nested = source?.[name]

    if (nested && typeof nested === 'object') {
      return {
        used: Number(nested.used ?? nested.taken ?? 0),
        total: Number(nested.total ?? nested.available ?? nested.limit ?? 0),
      }
    }

    return {
      used: Number(source?.[`${name}_used`] ?? 0),
      total: Number(source?.[`${name}_total`] ?? source?.[`${name}_available`] ?? 0),
    }
  }

  return {
    casual: readBucket('casual'),
    medical: readBucket('medical'),
    earned: readBucket('earned'),
  }
}

function normalizeHistory(payload) {
  const rows = payload?.history ?? payload?.items ?? payload?.leaves ?? payload?.data ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    id: row.id ?? row.leave_id ?? `my-leave-${idx}`,
    fromDate: row.from_date ?? row.start_date ?? row.from ?? row.date,
    toDate: row.to_date ?? row.end_date ?? row.to ?? row.date,
    days: Number(row.duration_days ?? row.days ?? 1),
    leaveType: String(row.leave_type ?? row.type ?? 'casual').toLowerCase(),
    reason: row.reason ?? row.note ?? '--',
    status: String(row.status ?? 'pending').toLowerCase(),
    approvedBy: row.approved_by ?? row.manager_name ?? '--',
  }))
}

function percentageLeft(balance) {
  if (!balance.total) return 0
  const left = Math.max(0, balance.total - balance.used)
  return Math.round((left / balance.total) * 100)
}

function BalanceCard({ title, balance, accentClass, note }) {
  return (
    <article className="bg-surface-container-lowest shadow-ghost px-4 py-4 relative">
      <span className={`absolute left-0 top-0 h-full w-1 ${accentClass}`} />
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{title}</p>
      <p className="text-4xl font-black font-headline mt-1">{String(balance.total - balance.used).padStart(2, '0')} <span className="text-base font-bold text-on-surface-variant">/ {balance.total} days</span></p>
      <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-current text-[10px]">{percentageLeft(balance)}%</span>
        {note}
      </div>
    </article>
  )
}

export default function MyLeavesPage() {
  const user = useAuthStore((s) => s.user)

  const [showApplyForm, setShowApplyForm] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState(formatInputDate(startOfMonth(new Date())))
  const [toDate, setToDate] = useState(formatInputDate(new Date()))

  const balancesQuery = useMyLeaveBalances({ from: fromDate, to: toDate })
  const historyQuery = useMyLeaveHistory({ from: fromDate, to: toDate })
  const applyLeave = useApplyLeave()

  const balances = useMemo(() => normalizeBalances(balancesQuery.data), [balancesQuery.data])
  const history = useMemo(() => normalizeHistory(historyQuery.data), [historyQuery.data])

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      const matchesSearch =
        !searchText ||
        row.reason.toLowerCase().includes(searchText.toLowerCase()) ||
        row.leaveType.toLowerCase().includes(searchText.toLowerCase())

      const matchesStatus = statusFilter === 'all' || row.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [history, searchText, statusFilter])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(APPLY_LEAVE_SCHEMA),
    defaultValues: {
      fromDate: formatInputDate(new Date()),
      toDate: formatInputDate(new Date()),
      leaveType: '',
      reason: '',
    },
  })

  async function onSubmitApply(values) {
    try {
      await toast.promise(
        applyLeave.mutateAsync({
          from_date: values.fromDate,
          to_date: values.toDate,
          leave_type: values.leaveType,
          reason: values.reason,
        }),
        {
          loading: 'Submitting leave request...',
          success: 'Leave request submitted.',
          error: 'Could not submit leave request.',
        }
      )

      reset({
        fromDate: formatInputDate(new Date()),
        toDate: formatInputDate(new Date()),
        leaveType: '',
        reason: '',
      })
      setShowApplyForm(false)
    } catch {
      // Toast already shown
    }
  }

  return (
    <LeaveShell
      title="My Leaves"
      subtitle="Manage your time-off requests and view remaining balances."
      rightSlot={
        <button
          type="button"
          onClick={() => setShowApplyForm((prev) => !prev)}
          className="h-9 px-4 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">add</span>
          Apply Leave
        </button>
      }
    >
      <div className="space-y-4">
        {showApplyForm && (
          <section className="bg-surface-container-lowest shadow-ghost p-4 sm:p-5">
            <h2 className="text-xl font-black font-headline text-on-surface">Apply for Leave</h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmitApply)} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="apply-from-date" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">From Date</label>
                  <input
                    id="apply-from-date"
                    type="date"
                    {...register('fromDate')}
                    className="w-full h-10 bg-surface-container-low border border-outline-variant/20 px-3 text-sm"
                  />
                  {errors.fromDate?.message && <p className="mt-1 text-xs text-error">{errors.fromDate.message}</p>}
                </div>

                <div>
                  <label htmlFor="apply-to-date" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">To Date</label>
                  <input
                    id="apply-to-date"
                    type="date"
                    {...register('toDate')}
                    className="w-full h-10 bg-surface-container-low border border-outline-variant/20 px-3 text-sm"
                  />
                  {errors.toDate?.message && <p className="mt-1 text-xs text-error">{errors.toDate.message}</p>}
                </div>

                <div>
                  <label htmlFor="apply-leave-type" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Leave Type</label>
                  <select
                    id="apply-leave-type"
                    {...register('leaveType')}
                    className="w-full h-10 bg-surface-container-low border border-outline-variant/20 px-3 text-sm"
                  >
                    <option value="">Select leave type</option>
                    <option value="casual">Casual Leave</option>
                    <option value="medical">Medical Leave</option>
                    <option value="earned">Earned Leave</option>
                  </select>
                  {errors.leaveType?.message && <p className="mt-1 text-xs text-error">{errors.leaveType.message}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="apply-reason" className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Reason</label>
                <textarea
                  id="apply-reason"
                  rows={3}
                  {...register('reason')}
                  className="w-full bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-sm"
                  placeholder="Add clear reason for this leave request"
                />
                {errors.reason?.message && <p className="mt-1 text-xs text-error">{errors.reason.message}</p>}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyForm(false)}
                  className="px-3 py-2 bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || applyLeave.isPending}
                  className="px-3 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(balancesQuery.isLoading && !balancesQuery.data) ? (
            Array.from({ length: 3 }).map((_, idx) => <LeaveCardSkeleton key={idx} />)
          ) : (
            <>
              <BalanceCard title="Casual Leave" balance={balances.casual} accentClass="bg-emerald-600" note="Expires end of year" />
              <BalanceCard title="Medical Leave" balance={balances.medical} accentClass="bg-cyan-600" note="Carryover as per policy" />
              <BalanceCard title="Earned Leave" balance={balances.earned} accentClass="bg-amber-600" note="Accruing monthly" />
            </>
          )}
        </section>

        <section className="bg-surface-container-lowest shadow-ghost overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-2xl font-black font-headline text-on-surface">Leave History</h2>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold"
                aria-label="History from date"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold"
                aria-label="History to date"
              />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search reason..."
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-sm"
                aria-label="Search reason"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 bg-surface-container-low border border-outline-variant/20 px-3 text-xs font-bold uppercase tracking-widest"
                aria-label="History status filter"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {(historyQuery.isLoading && !historyQuery.data) ? (
            <LeavePanelSkeleton rows={4} testId="leave-history-skeleton" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-surface-container-high border-b border-outline-variant/20">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">From Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">To Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Days</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Leave Type</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Reason</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-on-surface-variant">No leave records found.</td>
                    </tr>
                  ) : (
                    filteredHistory.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container-low/50">
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{row.fromDate}</td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{row.toDate}</td>
                        <td className="px-4 py-3 text-sm font-mono text-on-surface">{row.days.toFixed(1)}</td>
                        <td className="px-4 py-3"><LeaveStatusBadge value={row.leaveType} kind="type" /></td>
                        <td className="px-4 py-3 text-sm text-on-surface">{row.reason}</td>
                        <td className="px-4 py-3"><LeaveStatusBadge value={row.status} /></td>
                        <td className="px-4 py-3 text-sm text-on-surface-variant">{row.approvedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
            Showing {filteredHistory.length} of {history.length} records
          </div>
        </section>
      </div>

      {!user && (
        <p className="mt-4 text-xs text-on-surface-variant">User context unavailable.</p>
      )}
    </LeaveShell>
  )
}
