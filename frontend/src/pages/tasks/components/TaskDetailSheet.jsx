import { format, parseISO, isPast } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuthStore } from '@/store/authStore'
import TaskStatusBadge from './TaskStatusBadge'
import MiniMap from '@/components/maps/MiniMap'

// ── Activity chain ─────────────────────────────────────────────────────────

function ActivityChain({ events = [] }) {
  if (!events.length) return null
  return (
    <div className="space-y-3">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                ev.done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {ev.done ? '✓' : ''}
            </span>
            {i < events.length - 1 && (
              <span className="w-px flex-1 bg-gray-200 mt-1" />
            )}
          </div>
          <div className="pb-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {ev.type}
            </p>
            <p className="text-sm text-gray-600">{ev.description}</p>
            {ev.timestamp && (
              <p className="text-xs text-gray-400 mt-0.5">
                {format(parseISO(ev.timestamp), 'MMM d, hh:mm a')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
      {children}
    </p>
  )
}

// ── Sheet ──────────────────────────────────────────────────────────────────

export default function TaskDetailSheet({ task, open, onOpenChange, onReassign, onUpdateStatus }) {
  const role = useAuthStore((s) => s.user?.role?.toLowerCase())
  const isManager = role === 'owner' || role === 'manager'

  if (!task) return null

  const deadline = task.deadline ?? task.due_date
  const isOverdue = deadline && isPast(parseISO(deadline)) && task.status !== 'completed'
  const repeatCount = task.repeat_count ?? 1
  const recordCount = task.record_count ?? 0
  const pct = Math.min(100, Math.round((recordCount / repeatCount) * 100))
  const fullyDone = recordCount >= repeatCount

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-40" />

        {/* Slide-in from right */}
        <Dialog.Content
          className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right
            duration-300"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TaskStatusBadge status={task.status} />
                <span className="text-xs text-gray-400 font-mono">#{task.id}</span>
              </div>
              <Dialog.Title className="text-lg font-bold text-gray-900 leading-tight">
                {task.title ?? task.activity_type}
              </Dialog.Title>
            </div>
            <Dialog.Close
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4 mt-0.5"
              aria-label="Close"
            >
              &times;
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Core Specifications */}
            <section>
              <SectionLabel>Core Specifications</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <div className={task.assignment_type === 'group' ? 'col-span-2' : ''}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    {task.assignment_type === 'group' ? 'Group Members' : 'Assigned To'}
                  </p>
                  {task.assignment_type === 'group' ? (
                    <div className="flex flex-wrap gap-2">
                      {(task.member_names ?? []).length > 0 ? (
                        task.member_names.map((name, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                            <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center">
                              {name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No members assigned</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold uppercase">
                        {(task.assigned_to_name ?? task.assigned_to?.name ?? '?')[0]}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {task.assigned_to_name ?? task.assigned_to?.name ?? '—'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    Region / Village
                  </p>
                  <p className="text-sm font-medium text-gray-800">{task.village ?? '—'}</p>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    Priority
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                      task.priority === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {task.priority ?? 'Normal'}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                    Deadline
                  </p>
                  <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                    {deadline ? format(parseISO(deadline), 'MMM d, yyyy') : '—'}
                  </p>
                </div>

                {(task.dept ?? task.department) && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                      Department
                    </p>
                    <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                      {task.dept ?? task.department}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Repetitions Progress */}
            <section>
              <SectionLabel>Repetitions Progress</SectionLabel>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-black ${fullyDone ? 'text-green-600' : 'text-gray-900'}`}>
                      {recordCount}
                      <span className="text-base font-medium text-gray-400"> / {repeatCount}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fullyDone
                        ? 'All repetitions completed'
                        : `${repeatCount - recordCount} remaining`}
                    </p>
                  </div>
                  {fullyDone && (
                    <span className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">
                      ✓
                    </span>
                  )}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${fullyDone ? 'bg-green-500' : 'bg-green-700'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: Math.min(repeatCount, 20) }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                        i < recordCount
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                  ))}
                  {repeatCount > 20 && (
                    <span className="text-xs text-gray-400 self-center">+{repeatCount - 20} more</span>
                  )}
                </div>
              </div>
            </section>

            {/* Task Description */}
            {task.description && (
              <section>
                <SectionLabel>Task Description</SectionLabel>
                <blockquote className="border-l-4 border-green-600 pl-4 text-sm text-gray-600 italic bg-gray-50 py-3 pr-3 rounded-r-lg">
                  &ldquo;{task.description}&rdquo;
                </blockquote>
              </section>
            )}

            {/* Location Context */}
            <section>
              <SectionLabel>Location Context</SectionLabel>
              <MiniMap
                location={{ lat: task.lat, lng: task.lng }}
                className="w-full h-40"
              />
            </section>

            {/* Activity Chain */}
            {task.activity_chain?.length > 0 && (
              <section>
                <SectionLabel>Activity Chain</SectionLabel>
                <ActivityChain events={task.activity_chain} />
              </section>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            {isManager && (
              <button
                type="button"
                onClick={() => onReassign?.(task)}
                className="flex-1 py-2.5 border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 uppercase tracking-wide"
              >
                Edit Task
              </button>
            )}
            <button
              type="button"
              onClick={() => onUpdateStatus?.(task)}
              className={`flex-1 py-2.5 text-sm font-semibold uppercase tracking-wide ${
                isManager
                  ? 'bg-error/90 hover:bg-error text-white'
                  : 'bg-green-700 hover:bg-green-600 text-white'
              }`}
            >
              {isManager ? 'Delete Task' : 'Submit Completion'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
