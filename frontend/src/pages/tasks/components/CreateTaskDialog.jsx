import { useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Label from '@radix-ui/react-label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useActivityTypes, useFieldStaff, useCreateTask } from '../hooks/useTasks'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  activity_type: z.string().min(1, 'Activity type is required'),
  assigned_to: z.string().optional(),
  dept: z.string().optional(),
  deadline: z.string().optional(),
  description: z.string().optional(),
})

// ── Field helpers ──────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────

export default function CreateTaskDialog({ open, onOpenChange }) {
  // Only fetch when dialog is open — avoids unnecessary requests at page load
  const { data: activityTypes = [] } = useActivityTypes({ enabled: open })
  const { data: fieldStaff = [] } = useFieldStaff({ enabled: open })
  const createTask = useCreateTask()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  async function onSubmit(values) {
    // Strip empty optional fields before sending
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    )
    try {
      await toast.promise(createTask.mutateAsync(payload), {
        loading: 'Creating task…',
        success: 'Task created!',
        error: (err) => err.response?.data?.detail ?? 'Failed to create task',
      })
      onOpenChange(false)
    } catch {
      // toast already rendered
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-on-surface/35 z-40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest shadow-ghost p-6
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-xl font-black font-headline text-on-surface tracking-tight">
              Create Task
            </Dialog.Title>
            <Dialog.Close
              className="text-on-surface-variant hover:text-on-surface text-xl leading-none"
              aria-label="Close"
            >
              &times;
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label="Title" htmlFor="title" error={errors.title?.message}>
              <input
                id="title"
                {...register('title')}
                className={inputCls}
                placeholder="e.g. Soil pH Sampling — North Valley"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Activity Type"
                htmlFor="activity_type"
                error={errors.activity_type?.message}
              >
                <select id="activity_type" {...register('activity_type')} className={inputCls}>
                  <option value="">Select…</option>
                  {activityTypes.map((t) => (
                    // value = name (string) to match TaskCreate.activity_type: str
                    <option key={t.id ?? t} value={t.name ?? t}>
                      {t.name ?? t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Assigned To"
                htmlFor="assigned_to"
                error={errors.assigned_to?.message}
              >
                <select id="assigned_to" {...register('assigned_to')} className={inputCls}>
                  <option value="">Unassigned</option>
                  {fieldStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Department" htmlFor="dept" error={errors.dept?.message}>
                <select id="dept" {...register('dept')} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Production">Production</option>
                  <option value="R&D">R&amp;D</option>
                  <option value="Processing">Processing</option>
                  <option value="Field Ops">Field Ops</option>
                </select>
              </Field>

              <Field label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
                <input
                  id="deadline"
                  type="date"
                  {...register('deadline')}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field
              label="Notes / Description"
              htmlFor="description"
              error={errors.description?.message}
            >
              <textarea
                id="description"
                {...register('description')}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Operational notes, instructions…"
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 bg-surface-container-low text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
