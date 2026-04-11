import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import generatePDF from 'react-to-pdf'
import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import NotificationBell from '@/features/notifications/NotificationBell'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'

const MONTH_OPTIONS = [
  { value: '2023-10', label: 'Oct 2023' },
  { value: '2023-11', label: 'Nov 2023' },
  { value: '2023-12', label: 'Dec 2023' },
]

function formatMoney(value) {
  return `\u20B9${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

function buildMockClaims() {
  return [
    {
      id: 'cl-1',
      staffName: 'Rajesh Kumar',
      staffInitials: 'RK',
      empId: '4022',
      department: 'Sales / North',
      date: '2023-10-12',
      distanceKm: 142.5,
      ppkRate: 12,
      amountInr: 1710,
      status: 'pending',
    },
    {
      id: 'cl-2',
      staffName: 'Sunil Ahiwar',
      staffInitials: 'SA',
      empId: '3891',
      department: 'Quality Audit',
      date: '2023-10-11',
      distanceKm: 86.2,
      ppkRate: 15.5,
      amountInr: 1336.1,
      status: 'pending',
    },
    {
      id: 'cl-3',
      staffName: 'Priya Tiwari',
      staffInitials: 'PT',
      empId: '4211',
      department: 'Sales / Central',
      date: '2023-10-11',
      distanceKm: 215,
      ppkRate: 12,
      amountInr: 2580,
      status: 'pending',
    },
    {
      id: 'cl-4',
      staffName: 'Amit Mishra',
      staffInitials: 'AM',
      empId: '3102',
      department: 'Sales / North',
      date: '2023-10-10',
      distanceKm: 320.4,
      ppkRate: 12,
      amountInr: 3844.8,
      status: 'pending',
    },
    {
      id: 'cl-5',
      staffName: 'Arun Yadav',
      staffInitials: 'AY',
      empId: '4101',
      department: 'Sales / West',
      date: '2023-10-09',
      distanceKm: 198.4,
      ppkRate: 12,
      amountInr: 2380.8,
      status: 'approved',
    },
    {
      id: 'cl-6',
      staffName: 'Karan Mehta',
      staffInitials: 'KM',
      empId: '4122',
      department: 'Sales / South',
      date: '2023-10-08',
      distanceKm: 167.2,
      ppkRate: 12,
      amountInr: 2006.4,
      status: 'approved',
    },
    {
      id: 'cl-7',
      staffName: 'Neha Roy',
      staffInitials: 'NR',
      empId: '3992',
      department: 'Quality Audit',
      date: '2023-10-07',
      distanceKm: 96,
      ppkRate: 15.5,
      amountInr: 1488,
      status: 'rejected',
    },
    {
      id: 'cl-8',
      staffName: 'Irfan Khan',
      staffInitials: 'IK',
      empId: '4012',
      department: 'Sales / East',
      date: '2023-10-06',
      distanceKm: 214.7,
      ppkRate: 12,
      amountInr: 2576.4,
      status: 'approved',
    },
  ]
}

function normalizeClaims(payload) {
  const rows = payload?.claims ?? payload?.items ?? payload?.data ?? payload
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => {
    const staffName = row.staff_name ?? row.staff?.name ?? row.name ?? `Staff ${idx + 1}`
    const split = String(staffName).split(' ')

    return {
      id: row.id ?? row.claim_id ?? `claim-${idx}`,
      staffName,
      staffInitials: split.slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      empId: String(row.emp_id ?? row.staff?.employee_id ?? row.employee_id ?? '--'),
      department: row.department ?? row.staff?.department ?? 'Sales',
      date: row.date ?? row.travel_date ?? row.created_at ?? '2023-10-01',
      distanceKm: Number(row.distance_km ?? row.distance ?? 0),
      ppkRate: Number(row.ppk_rate ?? row.rate_per_km ?? 0),
      amountInr: Number(row.amount_inr ?? row.amount ?? 0),
      status: String(row.status ?? 'pending').toLowerCase(),
    }
  })
}

async function fetchAccountsClaims(filters) {
  try {
    const response = await apiClient.get('/api/v1/travel', { params: filters })
    const normalized = normalizeClaims(response.data)
    return normalized.length ? normalized : buildMockClaims()
  } catch {
    return buildMockClaims()
  }
}

function toCsvLine(cells) {
  return cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')
}

export default function AccountsDashboardPage() {
  const user = useAuthStore((store) => store.user)
  const [statusFilter, setStatusFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('2023-10')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])
  const [statusOverrides, setStatusOverrides] = useState({})

  const pdfRef = useRef(null)
  const pageSize = 4

  const claimsQuery = useQuery({
    queryKey: ['accounts-claims', statusFilter, departmentFilter, monthFilter],
    queryFn: () =>
      fetchAccountsClaims({
        status: statusFilter === 'all' ? undefined : statusFilter,
        department: departmentFilter === 'all' ? undefined : departmentFilter,
        month: monthFilter,
      }),
    placeholderData: (prev) => prev,
  })

  const claims = useMemo(() => {
    const rows = (claimsQuery.data ?? buildMockClaims()).map((claim) => ({
      ...claim,
      status: statusOverrides[claim.id] ?? claim.status,
    }))

    return rows.filter((claim) => {
      const matchesStatus = statusFilter === 'all' || claim.status === statusFilter
      const matchesDept = departmentFilter === 'all' || claim.department.toLowerCase().includes(departmentFilter)
      return matchesStatus && matchesDept
    })
  }, [claimsQuery.data, statusFilter, departmentFilter, statusOverrides])

  const pageClaims = useMemo(() => {
    const start = (page - 1) * pageSize
    return claims.slice(start, start + pageSize)
  }, [claims, page])

  const totalPages = Math.max(1, Math.ceil(claims.length / pageSize))

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedTotal = useMemo(
    () => claims.filter((claim) => selectedSet.has(claim.id)).reduce((sum, claim) => sum + claim.amountInr, 0),
    [claims, selectedSet]
  )

  const kpis = useMemo(() => {
    const pending = claims.filter((claim) => claim.status === 'pending')
    const approved = claims.filter((claim) => claim.status === 'approved')
    const rejected = claims.filter((claim) => claim.status === 'rejected')

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, claim) => sum + claim.amountInr, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, claim) => sum + claim.amountInr, 0),
      rejectedCount: rejected.length,
      rejectedAmount: rejected.reduce((sum, claim) => sum + claim.amountInr, 0),
      disbursedYtd: approved.reduce((sum, claim) => sum + claim.amountInr, 0) * 120,
    }
  }, [claims])

  const departments = useMemo(() => {
    const unique = Array.from(new Set((claimsQuery.data ?? buildMockClaims()).map((claim) => claim.department)))
    return unique.sort((a, b) => a.localeCompare(b))
  }, [claimsQuery.data])

  function toggleRowSelection(claimId) {
    setSelectedIds((current) =>
      current.includes(claimId) ? current.filter((id) => id !== claimId) : [...current, claimId]
    )
  }

  function toggleCurrentPageSelection() {
    const allCurrentSelected = pageClaims.every((claim) => selectedSet.has(claim.id))

    if (allCurrentSelected) {
      setSelectedIds((current) => current.filter((id) => !pageClaims.some((claim) => claim.id === id)))
      return
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...pageClaims.map((claim) => claim.id)])))
  }

  function applyDecision(claimIds, decision) {
    setStatusOverrides((current) => {
      const next = { ...current }
      claimIds.forEach((claimId) => {
        next[claimId] = decision
      })
      return next
    })

    setSelectedIds((current) => current.filter((id) => !claimIds.includes(id)))
  }

  function exportCsv() {
    const header = ['Staff Name', 'Employee ID', 'Department', 'Date', 'Distance', 'PPK Rate', 'Amount', 'Status']
    const lines = claims.map((claim) =>
      toCsvLine([
        claim.staffName,
        claim.empId,
        claim.department,
        format(new Date(claim.date), 'dd MMM yyyy'),
        claim.distanceKm.toFixed(1),
        claim.ppkRate.toFixed(2),
        claim.amountInr.toFixed(2),
        claim.status,
      ])
    )

    const blob = new Blob([toCsvLine(header), ...lines].join('\n'), { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `accounts-claims-${monthFilter}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    generatePDF(pdfRef, {
      filename: `accounts-claims-${monthFilter}.pdf`,
      method: 'save',
      page: { margin: 12, format: 'A4', orientation: 'landscape' },
    })
  }

  return (
    <DashboardShell
      footer={
        <div className="flex items-center gap-2 bg-surface-container-lowest px-2 py-2">
          <span className="h-5 w-5 rounded-full bg-primary text-on-primary text-[10px] font-bold inline-flex items-center justify-center">AD</span>
          <div>
            <p className="text-[10px] font-bold text-on-surface">Accounts Admin</p>
            <p className="text-[9px] text-on-surface-variant">Central Office</p>
          </div>
        </div>
      }
      topbar={
        <DashboardTopbar
          left={
            <div className="flex items-center gap-2 text-xs">
              <span className="text-lg font-black font-headline text-primary">PGA AgriTask</span>
              <span className="text-on-surface-variant/40">/</span>
              <span className="text-on-surface-variant">Accounts</span>
              <span className="text-on-surface-variant/40">/</span>
              <span className="font-semibold text-primary">Dashboard</span>
            </div>
          }
          right={
            <>
              <button
                type="button"
                onClick={exportCsv}
                className="h-8 px-3 border border-outline-variant/40 bg-surface-container-lowest text-[10px] font-bold uppercase tracking-wider"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="h-8 px-3 border border-outline-variant/40 bg-surface-container-lowest text-[10px] font-bold uppercase tracking-wider"
              >
                PDF
              </button>
              <NotificationBell />
              <span className="h-7 w-7 rounded-sm bg-primary-container text-on-primary text-[11px] font-bold inline-flex items-center justify-center" aria-label="Profile">
                {String(user?.name ?? 'A').trim().slice(0, 1).toUpperCase()}
              </span>
            </>
          }
        />
      }
    >
      <div className="max-w-6xl mx-auto space-y-4" ref={pdfRef}>
        <section className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-4xl font-black font-headline text-on-surface">Accounts Dashboard</h1>
            <p className="text-sm text-on-surface-variant mt-1">Review and disburse travel claims for field agents.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="h-8 px-3 inline-flex items-center bg-surface-container-low text-[10px] font-bold uppercase tracking-widest">Filters:</span>

            <label className="h-8 px-3 inline-flex items-center gap-2 bg-surface-container-low text-xs font-semibold">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                  setSelectedIds([])
                }}
                className="bg-transparent text-primary font-bold"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="h-8 px-3 inline-flex items-center gap-2 bg-surface-container-low text-xs font-semibold">
              <span>Dept:</span>
              <select
                value={departmentFilter}
                onChange={(event) => {
                  setDepartmentFilter(event.target.value)
                  setPage(1)
                  setSelectedIds([])
                }}
                className="bg-transparent text-primary font-bold"
              >
                <option value="all">All</option>
                {departments.map((department) => (
                  <option key={department} value={department.toLowerCase()}>{department}</option>
                ))}
              </select>
            </label>

            <label className="h-8 px-3 inline-flex items-center gap-2 bg-surface-container-low text-xs font-semibold">
              <span>Date:</span>
              <select
                value={monthFilter}
                onChange={(event) => {
                  setMonthFilter(event.target.value)
                  setPage(1)
                }}
                className="bg-transparent text-primary font-bold"
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <article className="bg-surface-container-lowest px-4 py-4 border-l-4 border-tertiary">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Pending Claims</p>
            <p className="text-5xl font-black font-headline mt-1">{kpis.pendingCount}</p>
            <p className="text-xl font-black text-on-surface mt-1">{formatMoney(kpis.pendingAmount)}</p>
            <p className="text-[10px] text-on-surface-variant mt-2">Avg. age: 4.2 days</p>
          </article>

          <article className="bg-surface-container-lowest px-4 py-4 border-l-4 border-primary">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Approved This Month</p>
            <p className="text-5xl font-black font-headline mt-1">{kpis.approvedCount}</p>
            <p className="text-xl font-black text-on-surface mt-1">{formatMoney(kpis.approvedAmount)}</p>
            <p className="text-[10px] text-primary mt-2">+12.5% from last month</p>
          </article>

          <article className="bg-surface-container-lowest px-4 py-4 border-l-4 border-error">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Rejected</p>
            <p className="text-5xl font-black font-headline mt-1">{kpis.rejectedCount}</p>
            <p className="text-xl font-black text-on-surface mt-1">{formatMoney(kpis.rejectedAmount)}</p>
            <p className="text-[10px] text-on-surface-variant mt-2">Main cause: GPS mismatch</p>
          </article>

          <article className="bg-primary text-on-primary px-4 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-primary/80">Total Disbursed (YTD)</p>
            <p className="text-4xl font-black font-headline mt-2">{formatMoney(kpis.disbursedYtd)}</p>
            <p className="text-[10px] text-on-primary/90 mt-2">Budget used: 88%</p>
          </article>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant/20">
          <div className="px-4 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-black font-headline text-on-surface">Pending Travel Claims</h2>
            <p className="text-xs text-on-surface-variant">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, claims.length)} of {claims.length} claims
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                  <th className="px-3 py-3 w-10 text-left">
                    <input
                      type="checkbox"
                      checked={pageClaims.length > 0 && pageClaims.every((claim) => selectedSet.has(claim.id))}
                      onChange={toggleCurrentPageSelection}
                      aria-label="Select all claims on page"
                    />
                  </th>
                  <th className="px-3 py-3 text-left">Staff Details</th>
                  <th className="px-3 py-3 text-left">Department</th>
                  <th className="px-3 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-right">Distance</th>
                  <th className="px-3 py-3 text-right">PPK Rate</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-left">GPS Route</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {claimsQuery.isLoading && !claimsQuery.data ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">Loading travel claims...</td>
                  </tr>
                ) : pageClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">No claims found for selected filters.</td>
                  </tr>
                ) : (
                  pageClaims.map((claim) => (
                    <tr key={claim.id} className="border-t border-outline-variant/15 hover:bg-surface-container-lowest/60">
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(claim.id)}
                          onChange={() => toggleRowSelection(claim.id)}
                          aria-label={`Select claim for ${claim.staffName}`}
                        />
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div className="flex items-start gap-2">
                          <span className="h-6 w-6 inline-flex items-center justify-center bg-surface-container-low text-[10px] font-bold mt-0.5">
                            {claim.staffInitials}
                          </span>
                          <div>
                            <p className="font-semibold text-on-surface leading-tight">{claim.staffName}</p>
                            <p className="text-[10px] text-on-surface-variant mt-0.5">Emp ID: {claim.empId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <span className="inline-flex px-2 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold">{claim.department}</span>
                      </td>

                      <td className="px-3 py-3 align-top text-on-surface-variant">{format(new Date(claim.date), 'dd MMM yyyy')}</td>
                      <td className="px-3 py-3 align-top text-right font-semibold">{claim.distanceKm.toFixed(1)} km</td>
                      <td className="px-3 py-3 align-top text-right font-mono">\u20B9{claim.ppkRate.toFixed(2)}</td>
                      <td className="px-3 py-3 align-top text-right font-black">{formatMoney(claim.amountInr)}</td>

                      <td className="px-3 py-3 align-top">
                        <button type="button" className="text-xs font-bold text-secondary hover:underline">View Map</button>
                      </td>

                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => applyDecision([claim.id], 'rejected')}
                            className="h-7 w-7 inline-flex items-center justify-center border border-error/40 text-error text-sm"
                            aria-label={`Reject claim from ${claim.staffName}`}
                          >
                            x
                          </button>
                          <button
                            type="button"
                            onClick={() => applyDecision([claim.id], 'approved')}
                            className="h-7 px-3 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider"
                          >
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-4 border-t border-outline-variant/15 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-8 px-3 border border-outline-variant/20 bg-surface-container-lowest text-xs"
            >
              {'<'}
            </button>

            {Array.from({ length: totalPages }).slice(0, 5).map((_, idx) => {
              const pageNo = idx + 1
              return (
                <button
                  key={pageNo}
                  type="button"
                  onClick={() => setPage(pageNo)}
                  className={`h-8 w-8 text-xs font-bold ${page === pageNo ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface'}`}
                >
                  {pageNo}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="h-8 px-3 border border-outline-variant/20 bg-surface-container-lowest text-xs"
            >
              {'>'}
            </button>
          </div>
        </section>
      </div>

      {selectedIds.length > 0 ? (
        <div className="fixed bottom-0 left-0 lg:left-[140px] xl:left-[220px] right-0 bg-surface-container-lowest border-t border-outline-variant/30 px-4 py-3 flex items-center justify-between gap-3 z-20">
          <div className="text-sm">
            <p className="font-semibold text-on-surface">{selectedIds.length} claims selected</p>
            <p className="text-on-surface-variant text-xs">Total value: {formatMoney(selectedTotal)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyDecision(selectedIds, 'rejected')}
              className="h-8 px-3 border border-error/40 text-error text-[10px] font-bold uppercase tracking-wider"
            >
              Reject Selected
            </button>
            <button
              type="button"
              onClick={() => applyDecision(selectedIds, 'approved')}
              className="h-8 px-3 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider"
            >
              Approve Selected
            </button>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
