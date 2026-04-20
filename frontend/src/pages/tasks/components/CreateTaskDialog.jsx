import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Label from '@radix-ui/react-label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useFieldStaff, useCreateTask } from '../hooks/useTasks'
import {
  DEPARTMENTS,
  SEASONS,
  INDIAN_STATES,
  getActivities,
  getActivity,
} from '../constants/activityCatalog'

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  dept: z.string().min(1, 'Department is required'),
  season: z.string().min(1, 'Season is required'),
  activity_type: z.string().min(1, 'Activity is required'),

  // Common fields
  state: z.string().optional(),
  assigned_to: z.string().optional(),
  territory: z.string().optional(),
  crop: z.string().optional(),
  product: z.string().optional(),
  target: z.coerce.number().int().min(1).default(1),
  description: z.string().optional(),
  month: z.string().optional(),
  location: z.string().optional(),
  deadline: z.string().optional(),
})

// ── Small helpers ──────────────────────────────────────────────────────────

function FieldError({ message }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-error">{message}</p>
}

function Field({ label, htmlFor, error, required, children }) {
  return (
    <div>
      <Label.Root
        htmlFor={htmlFor}
        className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1"
      >
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </Label.Root>
      {children}
      <FieldError message={error} />
    </div>
  )
}

const inputCls =
  'w-full bg-surface-container-low border-none px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50'

// ── Department / Season selector tabs ────────────────────────────────────

function SegmentedControl({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex bg-surface-container-low p-0.5 gap-0.5 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
            value === opt
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CreateTaskDialog({ open, onOpenChange }) {
  const { data: fieldStaff = [] } = useFieldStaff({ enabled: open })
  const createTask = useCreateTask()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { target: 1 },
  })

  const dept = watch('dept') ?? ''
  const season = watch('season') ?? ''
  const activityName = watch('activity_type') ?? ''

  const activities = getActivities(dept, season)
  const selectedActivity = getActivity(dept, season, activityName)
  const requiresLocation = selectedActivity?.requiresLocation ?? false

  // When dept or season changes, clear activity (and its derived unit)
  useEffect(() => {
    setValue('activity_type', '')
  }, [dept, season, setValue])

  // Reset everything when dialog closes
  useEffect(() => {
    if (!open) reset({ target: 1 })
  }, [open, reset])

  async function onSubmit(values) {
    // auto-derive the unit from the selected activity
    const unit = selectedActivity?.unit ?? 'NOS'

    // title is auto-generated from activity + dept + season
    const title = `${values.activity_type} — ${values.dept} (${values.season})`

    const payload = {
      ...Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== '' && v != null)
      ),
      title,
      unit,
      assignment_type: 'singular',
    }

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
        <Dialog.Overlay className="fixed inset-0 bg-on-surface/35 z-40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2
            bg-surface-container-lowest shadow-ghost p-6 max-h-[92vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-xl font-black font-headline text-on-surface tracking-tight">
                Assign Task
              </Dialog.Title>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Fill in the fields below to assign a task to field staff.
              </p>
            </div>
            <Dialog.Close
              className="text-on-surface-variant hover:text-on-surface text-xl leading-none mt-1"
              aria-label="Close"
            >
              &times;
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* ── Step 1 · Department ───────────────────────────────── */}
            <section className="bg-surface-container-low p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                Step 1 — Select Department &amp; Season
              </p>

              <Field label="Department" htmlFor="dept" required error={errors.dept?.message}>
                <div className="mt-1">
                  <SegmentedControl
                    options={DEPARTMENTS}
                    value={dept}
                    onChange={(v) => setValue('dept', v, { shouldValidate: true })}
                  />
                  <input type="hidden" {...register('dept')} />
                </div>
              </Field>

              {dept && (
                <Field label="Season" htmlFor="season" required error={errors.season?.message}>
                  <div className="mt-1">
                    <SegmentedControl
                      options={SEASONS}
                      value={season}
                      onChange={(v) => setValue('season', v, { shouldValidate: true })}
                    />
                    <input type="hidden" {...register('season')} />
                  </div>
                </Field>
              )}
            </section>

            {/* ── Step 2 · Activity Plan ────────────────────────────── */}
            {dept && season && (
              <section className="bg-surface-container-low p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Step 2 — Activity Plan
                </p>

                <Field label="Activity Plan" htmlFor="activity_type" required error={errors.activity_type?.message}>
                  <select id="activity_type" {...register('activity_type')} className={inputCls}>
                    <option value="">Select activity…</option>
                    {activities.map((a) => (
                      <option key={a.name} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </Field>

                {/* Unit badge auto-derived from selected activity */}
                {selectedActivity && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant">Metric unit:</span>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black uppercase tracking-wider">
                      {selectedActivity.unit}
                    </span>
                    {requiresLocation && (
                      <span className="px-2 py-1 bg-tertiary/10 text-tertiary text-xs font-bold uppercase tracking-wider">
                        Location required
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── Step 3 · Common Fields ────────────────────────────── */}
            {dept && season && activityName && (
              <section className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary px-0.5">
                  Step 3 — Task Details
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* State */}
                  <Field label="State" htmlFor="state" error={errors.state?.message}>
                    <select id="state" {...register('state')} className={inputCls}>
                      <option value="">Select state…</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>

                  {/* ASM / Assign To */}
                  <Field label="ASM Name" htmlFor="assigned_to" error={errors.assigned_to?.message}>
                    <select id="assigned_to" {...register('assigned_to')} className={inputCls}>
                      <option value="">Unassigned</option>
                      {fieldStaff.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>

                  {/* ST / Territory */}
                  <Field label="ST / Territory" htmlFor="territory" error={errors.territory?.message}>
                    <input
                      id="territory"
                      {...register('territory')}
                      className={inputCls}
                      placeholder="e.g. Nashik North"
                    />
                  </Field>

                  {/* Target Crop */}
                  <Field label="Target Crop" htmlFor="crop" error={errors.crop?.message}>
                    <input
                      id="crop"
                      {...register('crop')}
                      className={inputCls}
                      placeholder="e.g. Cotton, Tomato"
                    />
                  </Field>

                  {/* Focus Product */}
                  <Field label="Focus Product" htmlFor="product" error={errors.product?.message}>
                    <input
                      id="product"
                      {...register('product')}
                      className={inputCls}
                      placeholder="e.g. PS-Hybrid 202"
                    />
                  </Field>

                  {/* Nos / Target Count */}
                  <Field label={`Nos / Target Count (${selectedActivity?.unit ?? 'NOS'})`} htmlFor="target" error={errors.target?.message}>
                    <input
                      id="target"
                      type="number"
                      min={1}
                      {...register('target')}
                      className={inputCls}
                      placeholder="e.g. 50"
                    />
                  </Field>

                  {/* Month */}
                  <Field label="Month" htmlFor="month" error={errors.month?.message}>
                    <input
                      id="month"
                      type="month"
                      {...register('month')}
                      className={inputCls}
                    />
                  </Field>

                  {/* Deadline */}
                  <Field label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
                    <input
                      id="deadline"
                      type="date"
                      {...register('deadline')}
                      className={inputCls}
                    />
                  </Field>
                </div>

                {/* Location — only for Production/R&D Pre-Season */}
                {requiresLocation && (
                  <Field label="Location / Field Site" htmlFor="location" required error={errors.location?.message}>
                    <input
                      id="location"
                      {...register('location')}
                      className={inputCls}
                      placeholder="e.g. Survey No. 24, Village Pimpalner"
                    />
                  </Field>
                )}

                {/* Description */}
                <Field label="Description / Instructions" htmlFor="description" error={errors.description?.message}>
                  <textarea
                    id="description"
                    {...register('description')}
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="Operational notes, special instructions…"
                  />
                </Field>
              </section>
            )}

            {/* ── Actions ───────────────────────────────────────────── */}
            <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
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
                disabled={isSubmitting || !dept || !season || !activityName}
                className="px-5 py-2 bg-primary text-on-primary text-sm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isSubmitting ? 'Assigning…' : 'Assign Task'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
