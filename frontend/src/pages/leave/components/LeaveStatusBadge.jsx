const STATUS_STYLE = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-700',
}

const TYPE_STYLE = {
  casual: 'bg-emerald-100 text-emerald-800',
  medical: 'bg-cyan-100 text-cyan-800',
  earned: 'bg-amber-100 text-amber-800',
}

function pretty(value) {
  return String(value ?? '--')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function LeaveStatusBadge({ value, kind = 'status' }) {
  const key = String(value ?? '').toLowerCase()
  const style = kind === 'type' ? TYPE_STYLE[key] ?? 'bg-slate-100 text-slate-700' : STATUS_STYLE[key] ?? 'bg-slate-100 text-slate-700'

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${style}`}>
      {pretty(value)}
    </span>
  )
}
