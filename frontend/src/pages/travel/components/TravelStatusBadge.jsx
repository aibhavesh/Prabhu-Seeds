const STATUS_STYLES = {
  pending: 'bg-amber-500/15 text-amber-700',
  approved: 'bg-primary/15 text-primary',
  rejected: 'bg-error/15 text-error',
}

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function TravelStatusBadge({ status }) {
  const key = String(status ?? 'pending').toLowerCase()
  return (
    <span className={`inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[key] ?? STATUS_STYLES.pending}`}>
      {STATUS_LABELS[key] ?? status}
    </span>
  )
}
