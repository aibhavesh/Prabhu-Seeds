const STATUS_STYLES = {
  pending: 'bg-amber-500/15 text-amber-700',
  in_progress: 'bg-blue-500/15 text-blue-700',
  completed: 'bg-primary/15 text-primary',
  overdue: 'bg-error/15 text-error',
}

const STATUS_LABELS = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  overdue:     'Overdue',
}

export default function TaskStatusBadge({ status }) {
  const key = status?.toLowerCase() ?? 'pending'
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${STATUS_STYLES[key] ?? STATUS_STYLES.pending}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  )
}
