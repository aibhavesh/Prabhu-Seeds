import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Label from '@radix-ui/react-label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useActivityTypes, useFieldStaff, useUpdateTask } from '../hooks/useTasks'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  activity_type: z.string().optional(),
  assignment_type: z.enum(['singular', 'group']).default('singular'),
  assigned_to: z.string().optional(),
  dept: z.string().optional(),
  deadline: z.string().optional(),
  description: z.string().optional(),
  repeat_count: z.coerce.number().int().min(1).max(365).default(1),
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-error">{message}</p>
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div>
      <Label.Root
        htmlFor={htmlFor}
        className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1"
      >
        {label}
      </Label.Root>
      {children}
      <FieldError message={error} />
    </div>
  )
}

const inputCls =
  'w-full bg-surface-container-low border-none px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'

function initials(name) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Member picker ──────────────────────────────────────────────────────────

function MemberPicker({ staff, selected, onToggle }) {
  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selected.map((id) => {
            const s = staff.find((x) => x.id === id)
            if (!s) return null
            return (
              <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[9px] font-bold flex items-center justify-center">
                  {initials(s.name)}
                </span>
                {s.name}
                <button type="button" onClick={() => onToggle(id)} className="ml-0.5 text-primary/60 hover:text-primary leading-none" aria-label={`Remove ${s.name}`}>
                  &times;
                </button>
              </span>
            )
          })}
        </div>
      )}
      <div className="max-h-44 overflow-y-auto divide-y divide-outline-variant/10 border border-outline-variant/20 bg-surface-container-lowest">
        {staff.length === 0 && (
          <p className="px-3 py-4 text-xs text-on-surface-variant text-center">No field agents found.</p>
        )}
        {staff.map((s) => {
          const checked = selected.includes(s.id)
          return (
            <button key={s.id} type="button" onClick={() => onToggle(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${checked ? 'bg-primary/8' : 'hover:bg-surface-container-low'}`}
            >
              <span className={`flex-shrink-0 w-4 h-4 border rounded flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-outline-variant/50 bg-white'}`}>
                {checked && (
                  <svg className="w-2.5 h-2.5 text-on-primary" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="w-7 h-7 rounded-full bg-primary-container text-on-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {initials(s.name)}
              </span>
              <span className={`text-sm ${checked ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>{s.name}</span>
              {checked && <span className="ml-auto text-[10px] font-bold text-primary uppercase tracking-wide">Added</span>}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-primary font-semibold">{selected.length} agent{selected.length !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EditTaskDialog({ task, open, onOpenChange }) {
  const { data: activityTypes = [] } = useActivityTypes({ enabled: open })
  const { data: fieldStaff = [] } = useFieldStaff({ enabled: open })
  const updateTask = useUpdateTask()

  const [selectedMembers, setSelectedMembers] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const assignmentType = watch('assignment_type')

  // Pre-fill when task/dialog changes
  useEffect(() => {
    if (open && task) {
      const type = task.assignment_type ?? 'singular'
      reset({
        title: task.title ?? '',
        activity_type: task.activity_type ?? '',
        assignment_type: type,
        assigned_to: task.assigned_to ? String(task.assigned_to) : '',
        dept: task.dept ?? '',
        deadline: task.deadline ?? '',
        description: task.description ?? '',
        repeat_count: task.repeat_count ?? 1,
      })
      // Restore group members (stored as UUIDs in task.members)
      if (type === 'group' && task.members?.length) {
        setSelectedMembers(task.members.map(String))
      } else {
        setSelectedMembers([])
      }
    }
  }, [open, task, reset])

  function toggleMember(id) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function onSubmit(values) {
    const payload = { taskId: task.id }
    if (values.title) payload.title = values.title
    if (values.activity_type) payload.activity_type = values.activity_type
    if (values.dept) payload.dept = values.dept
    if (values.deadline) payload.deadline = values.deadline
    if (values.description) payload.description = values.description
    if (values.repeat_count) payload.repeat_count = Number(values.repeat_count)
    payload.assignment_type = values.assignment_type

    if (values.assignment_type === 'group') {
      payload.members = selectedMembers
    } else {
      if (values.assigned_to) payload.assigned_to = values.assigned_to
    }

    try {
      await toast.promise(updateTask.mutateAsync(payload), {
        loading: 'Saving changes…',
        success: 'Task updated!',
        error: (err) => err.response?.data?.detail ?? 'Failed to update task',
      })
      onOpenChange(false)
    } catch {
      // toast already shown
    }
  }

  if (!task) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-on-surface/35 z-40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest shadow-ghost p-6 max-h-[90vh] overflow-y-auto
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <Dialog.Title className="text-xl font-black font-headline text-on-surface tracking-tight">
                Edit Task
              </Dialog.Title>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Task #{String(task.id).padStart(4, '0')}
              </p>
            </div>
            <Dialog.Close className="text-on-surface-variant hover:text-on-surface text-xl leading-none" aria-label="Close">
              &times;
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label="Title" htmlFor="edit-title" error={errors.title?.message}>
              <input id="edit-title" {...register('title')} className={inputCls} placeholder="Task title" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Activity Type" htmlFor="edit-activity_type" error={errors.activity_type?.message}>
                <select id="edit-activity_type" {...register('activity_type')} className={inputCls}>
                  <option value="">Select…</option>
                  {activityTypes.map((t) => (
                    <option key={t.id ?? t} value={t.name ?? t}>{t.name ?? t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Department" htmlFor="edit-dept" error={errors.dept?.message}>
                <select id="edit-dept" {...register('dept')} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Production">Production</option>
                  <option value="R&D">R&amp;D</option>
                  <option value="Processing">Processing</option>
                  <option value="Field Ops">Field Ops</option>
                </select>
              </Field>
            </div>

            <Field label="Deadline" htmlFor="edit-deadline" error={errors.deadline?.message}>
              <input id="edit-deadline" type="date" {...register('deadline')} className={inputCls} />
            </Field>

            {/* Assignment section */}
            <div className="bg-surface-container-low p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  Assignment Type
                </p>
                <div className="inline-flex rounded overflow-hidden border border-outline-variant/30">
                  {['singular', 'group'].map((type) => (
                    <button key={type} type="button"
                      onClick={() => { setValue('assignment_type', type); setSelectedMembers([]) }}
                      className={`px-5 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                        assignmentType === type
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">
                          {type === 'singular' ? 'person' : 'group'}
                        </span>
                        {type === 'singular' ? 'Singular' : 'Group'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {assignmentType === 'singular' ? (
                <Field label="Assign To" htmlFor="edit-assigned_to" error={errors.assigned_to?.message}>
                  <select id="edit-assigned_to" {...register('assigned_to')} className={inputCls}>
                    <option value="">Unassigned</option>
                    {fieldStaff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Select Field Agents
                  </p>
                  <MemberPicker staff={fieldStaff} selected={selectedMembers} onToggle={toggleMember} />
                </div>
              )}
            </div>

            <Field label="Repetitions Required" htmlFor="edit-repeat_count" error={errors.repeat_count?.message}>
              <input id="edit-repeat_count" type="number" min={1} max={365} {...register('repeat_count')} className={`${inputCls} w-28`} />
            </Field>

            <Field label="Notes / Description" htmlFor="edit-description" error={errors.description?.message}>
              <textarea id="edit-description" {...register('description')} rows={3} className={`${inputCls} resize-none`} placeholder="Operational notes, instructions…" />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 bg-surface-container-low text-sm font-medium text-on-surface-variant hover:bg-surface-container">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting || (assignmentType === 'group' && selectedMembers.length === 0)}
                className="px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
