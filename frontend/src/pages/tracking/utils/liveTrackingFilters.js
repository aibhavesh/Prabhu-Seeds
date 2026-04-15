import { differenceInMinutes, formatDistanceToNow, isToday } from 'date-fns'

export const DEPARTMENT_COLORS = {
  marketing:    '#0d631b',
  production:   '#2563eb',
  'r&d':        '#ea580c',
  processing:   '#7c3aed',
  'field ops':  '#0d631b',
  management:   '#2563eb',
  accounts:     '#ea580c',
  hq:           '#7c3aed',
}

/** Group an array of objects by a string key. */
export function groupByKey(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] ?? '—'
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function departmentColor(department) {
  if (!department) return '#0d631b'
  const key = String(department).toLowerCase()
  return DEPARTMENT_COLORS[key] ?? '#0d631b'
}

export function toStatus(lastSeen) {
  if (!lastSeen) return 'offline'

  const parsed = new Date(lastSeen)
  if (Number.isNaN(parsed.getTime())) return 'offline'
  if (!isToday(parsed)) return 'offline'

  const diffMinutes = Math.max(0, differenceInMinutes(new Date(), parsed))
  if (diffMinutes < 5) return 'online'
  if (diffMinutes < 30) return 'stale'
  return 'offline'
}

export function statusMeta(status) {
  switch (status) {
    case 'online':
      return {
        label: 'Online',
        dotClass: 'bg-emerald-500',
        markerOpacity: 1,
      }
    case 'stale':
      return {
        label: 'Stale',
        dotClass: 'bg-amber-500',
        markerOpacity: 0.8,
      }
    default:
      return {
        label: 'Offline',
        dotClass: 'bg-gray-400',
        markerOpacity: 0.55,
      }
  }
}

export function withDerivedFields(employee) {
  const status = toStatus(employee.last_seen)
  return {
    ...employee,
    status,
    statusMeta: statusMeta(status),
    departmentColor: departmentColor(employee.department),
    lastSeenLabel: employee.last_seen
      ? formatDistanceToNow(new Date(employee.last_seen), { addSuffix: true })
      : 'No recent check-in',
  }
}

export function filterEmployees(employees = [], filters = {}) {
  const {
    query = '',
    department = '',
    state = '',
    onlyOnline = false,
  } = filters

  const search = query.trim().toLowerCase()

  return employees.filter((employee) => {
    if (search) {
      const haystack = `${employee.name ?? ''} ${employee.department ?? ''} ${employee.state ?? ''}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }

    if (department && employee.department !== department) return false
    if (state && employee.state !== state) return false
    if (onlyOnline && employee.status !== 'online') return false

    return true
  })
}
