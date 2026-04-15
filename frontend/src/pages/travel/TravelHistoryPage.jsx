import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import apiClient from '@/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useTravelHistory } from './hooks/useTravel'
import useTravelJourney from './hooks/useTravelJourney'
import { downloadTravelSheet } from '@/utils/travelSheet'
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
    distanceKm: Number(row.distance_km ?? row.distance ?? row.km ?? 0),
    status: String(row.status ?? 'pending').toLowerCase(),
    originLabel: row.origin_label ?? row.origin?.label ?? row.origin_city ?? 'Start',
    destinationLabel: row.destination_label ?? row.destination?.label ?? row.destination_city ?? 'End',
    description: row.description ?? '',
    updates:
      row.timeline ??
      [
        { label: 'Claim Submitted', at: row.created_at ?? row.date, state: 'done' },
        {
          label:
            row.status === 'approved'
              ? 'Approved by Accounts'
              : row.status === 'rejected'
              ? 'Rejected by Accounts'
              : 'Under Review',
          at: row.updated_at ?? row.date,
          state:
            row.status === 'pending' ? 'active' : row.status === 'approved' ? 'done' : 'blocked',
        },
      ],
  }))
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
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
          {idx !== updates.length - 1 && (
            <span className="absolute left-[3px] top-3 h-full w-px bg-outline-variant/40" />
          )}
          <p className="text-xs font-bold text-on-surface">{update.label}</p>
          <p className="text-xs text-on-surface-variant">
            {update.at ? format(new Date(update.at), 'dd MMM yyyy, hh:mm a') : '--'}
          </p>
        </li>
      ))}
    </ol>
  )
}

// ── Journey Tracker Panel ──────────────────────────────────────────────────────

function JourneyTracker({ user }) {
  const queryClient = useQueryClient()
  const { active, startTime, totalKm, elapsed, gpsError, start, stop } = useTravelJourney()
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(null) // { startTime, endTime, totalKm }

  function handleStart() {
    setCompleted(null)
    start()
    toast.success('Journey started — GPS is now tracking.')
  }

  async function handleStop() {
    const endTime = Date.now()
    stop()
    setCompleted({ startTime, endTime, totalKm })
  }

  async function handleDownloadAndSave() {
    if (!completed) return
    const { startTime: st, endTime, totalKm: km } = completed

    setSaving(true)
    try {
      // 1. Download the filled Excel sheet
      await downloadTravelSheet({
        startTime: st,
        endTime,
        totalKm: km,
        staffName: user?.name ?? 'staff',
      })

      // 2. Save claim to backend (expense type=travel)
      const ratePerKm = 3.25
      const amount = parseFloat((km * ratePerKm).toFixed(2))
      const travelDate = format(new Date(st), 'yyyy-MM-dd')
      const depTime = format(new Date(st), 'HH:mm')
      const arrTime = format(new Date(endTime), 'HH:mm')

      await apiClient.post('/api/v1/expenses', {
        date: travelDate,
        type: 'travel',
        description: `Journey on ${format(new Date(st), 'dd MMM yyyy')} | Dep: ${depTime} → Arr: ${arrTime}`,
        amount,
        km: parseFloat(km.toFixed(2)),
        rate: ratePerKm,
      })

      queryClient.invalidateQueries({ queryKey: ['travel-history'] })
      toast.success('Claim saved and sheet downloaded!')
      setCompleted(null)
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to save claim.')
    } finally {
      setSaving(false)
    }
  }

  // ── Completed state — show summary + download button
  if (completed) {
    const durationSec = Math.floor((completed.endTime - completed.startTime) / 1000)
    const amount = (completed.totalKm * 3.25).toFixed(2)
    return (
      <div className="bg-surface-container-lowest shadow-ghost p-4 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Journey Complete
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Date" value={format(new Date(completed.startTime), 'dd MMM yyyy')} />
          <Stat label="Departure" value={format(new Date(completed.startTime), 'HH:mm')} />
          <Stat label="Arrival" value={format(new Date(completed.endTime), 'HH:mm')} />
          <Stat label="Duration" value={formatDuration(durationSec)} />
          <Stat label="Distance" value={`${completed.totalKm.toFixed(2)} km`} />
          <Stat label="Est. Amount" value={`₹${amount}`} />
        </div>
        <p className="text-xs text-on-surface-variant">
          Place of departure, arrival, and place of stay will need to be filled manually in the downloaded sheet.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadAndSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Download Sheet & Save Claim'}
          </button>
          <button
            type="button"
            onClick={() => setCompleted(null)}
            className="px-4 py-2 bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest"
          >
            Discard
          </button>
        </div>
      </div>
    )
  }

  // ── Active journey state
  if (active) {
    return (
      <div className="bg-surface-container-lowest shadow-ghost p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            Journey in Progress
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Started" value={startTime ? format(new Date(startTime), 'HH:mm') : '--'} />
          <Stat label="Distance" value={`${totalKm.toFixed(2)} km`} highlight />
          <Stat label="Elapsed" value={formatDuration(elapsed)} />
        </div>
        {gpsError && (
          <p className="text-xs text-error font-semibold">{gpsError}</p>
        )}
        <button
          type="button"
          onClick={handleStop}
          className="px-4 py-2 bg-error text-white text-xs font-bold uppercase tracking-widest"
        >
          End Journey
        </button>
      </div>
    )
  }

  // ── Idle state
  return (
    <div className="bg-surface-container-lowest shadow-ghost p-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <p className="text-sm font-bold text-on-surface">Start a Journey</p>
        <p className="text-xs text-on-surface-variant mt-0.5">
          GPS will track your distance. Download the filled travel claim sheet when done.
        </p>
        {gpsError && <p className="text-xs text-error font-semibold mt-1">{gpsError}</p>}
      </div>
      <button
        type="button"
        onClick={handleStart}
        className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest"
      >
        Start Journey
      </button>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-primary text-lg' : 'text-on-surface'}`}>
        {value}
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TravelHistoryPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useTravelHistory({ staffId: user?.id })
  const claims = useMemo(() => normalizeHistory(data), [data])

  return (
    <TravelShell
      title="My Travel"
      subtitle="Track journeys and manage reimbursement claims."
    >
      {/* Journey Tracker */}
      <JourneyTracker user={user} />

      {/* History */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant px-1">
          Claim History
        </p>

        {isLoading && <TravelSkeleton rows={3} />}

        {!isLoading && isError && (
          <div className="bg-error/10 text-error px-4 py-3 text-sm font-semibold">
            Failed to load travel history.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-3">
            {claims.length === 0 ? (
              <div className="bg-surface-container-lowest shadow-ghost px-4 py-8 text-center text-on-surface-variant text-sm">
                No travel claims yet. Start a journey above to create one.
              </div>
            ) : (
              claims.map((claim) => (
                <article
                  key={claim.id}
                  className="bg-surface-container-lowest shadow-ghost p-4 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-black font-headline text-on-surface">
                          {claim.description
                            ? claim.description.split('|')[0].trim()
                            : `${claim.originLabel} → ${claim.destinationLabel}`}
                        </p>
                        {claim.description?.includes('|') && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {claim.description.split('|').slice(1).join('|').trim()}
                          </p>
                        )}
                      </div>
                      <TravelStatusBadge status={claim.status} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Date</p>
                        <p className="text-sm font-semibold text-on-surface">
                          {claim.date ? format(new Date(claim.date), 'dd MMM yyyy') : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Distance</p>
                        <p className="text-sm font-semibold text-on-surface">
                          {claim.distanceKm > 0 ? `${claim.distanceKm.toFixed(1)} km` : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Amount</p>
                        <p className="text-sm font-semibold text-on-surface">
                          ₹{claim.amountInr.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      Status Timeline
                    </p>
                    <Timeline updates={claim.updates} />
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </TravelShell>
  )
}
