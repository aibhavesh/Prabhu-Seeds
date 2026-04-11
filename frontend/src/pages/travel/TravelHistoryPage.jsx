import { useMemo } from 'react'
import { format } from 'date-fns'
import { useAuthStore } from '@/store/authStore'
import { useTravelHistory } from './hooks/useTravel'
import TravelShell from './components/TravelShell'
import TravelStatusBadge from './components/TravelStatusBadge'
import TravelSkeleton from './components/TravelSkeleton'

function normalizeHistory(payload) {
  const rows = payload?.claims ?? payload?.items ?? payload?.data ?? []
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    id: row.id ?? row.claim_id ?? `history-${idx}`,
    date: row.date ?? row.travel_date ?? row.created_at,
    amountInr: Number(row.amount_inr ?? row.amount ?? 0),
    distanceKm: Number(row.distance_km ?? row.distance ?? 0),
    status: String(row.status ?? 'pending').toLowerCase(),
    originLabel: row.origin_label ?? row.origin?.label ?? row.origin_city ?? 'Start',
    destinationLabel: row.destination_label ?? row.destination?.label ?? row.destination_city ?? 'End',
    updates:
      row.timeline ??
      [
        { label: 'Claim Submitted', at: row.created_at ?? row.date, state: 'done' },
        {
          label: row.status === 'approved' ? 'Approved by Accounts' : row.status === 'rejected' ? 'Rejected by Accounts' : 'Under Review',
          at: row.updated_at ?? row.date,
          state: row.status === 'pending' ? 'active' : row.status === 'approved' ? 'done' : 'blocked',
        },
      ],
  }))
}

function Timeline({ updates }) {
  if (!updates?.length) return null

  return (
    <ol className="space-y-2">
      {updates.map((update, idx) => (
        <li key={`${update.label}-${idx}`} className="relative pl-6">
          <span
            className={`absolute left-0 top-1 h-2 w-2 rounded-full ${
              update.state === 'done'
                ? 'bg-primary'
                : update.state === 'blocked'
                ? 'bg-error'
                : 'bg-amber-500'
            }`}
          />
          {idx !== updates.length - 1 && <span className="absolute left-[3px] top-3 h-full w-px bg-outline-variant/40" />}
          <p className="text-xs font-bold text-on-surface">{update.label}</p>
          <p className="text-xs text-on-surface-variant">
            {update.at ? format(new Date(update.at), 'dd MMM yyyy, hh:mm a') : '--'}
          </p>
        </li>
      ))}
    </ol>
  )
}

export default function TravelHistoryPage() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, isError } = useTravelHistory({
    staffId: user?.id,
  })

  const claims = useMemo(() => normalizeHistory(data), [data])

  return (
    <TravelShell
      title="My Travel History"
      subtitle="Track reimbursement requests and approval progress."
    >
      {isLoading && <TravelSkeleton rows={3} />}

      {!isLoading && isError && (
        <div className="bg-error/10 text-error px-4 py-3 text-sm font-semibold">
          Failed to load travel history.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-4">
          {claims.length === 0 ? (
            <div className="bg-surface-container-lowest shadow-ghost px-4 py-8 text-center text-on-surface-variant">
              No travel claims found.
            </div>
          ) : (
            claims.map((claim) => (
              <article key={claim.id} className="bg-surface-container-lowest shadow-ghost p-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-lg font-black font-headline text-on-surface">
                      {claim.originLabel} → {claim.destinationLabel}
                    </p>
                    <TravelStatusBadge status={claim.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Date</p>
                      <p className="text-sm font-semibold text-on-surface">
                        {claim.date ? format(new Date(claim.date), 'dd MMM yyyy') : '--'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Distance</p>
                      <p className="text-sm font-semibold text-on-surface">{claim.distanceKm.toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Amount</p>
                      <p className="text-sm font-semibold text-on-surface">₹{claim.amountInr.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status Timeline</p>
                  <Timeline updates={claim.updates} />
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </TravelShell>
  )
}
