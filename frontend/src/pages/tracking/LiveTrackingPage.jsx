import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Map, useMap } from '@vis.gl/react-google-maps'
import GoogleMapProvider from '@/components/maps/GoogleMapProvider'
import EmployeeMarker from '@/components/maps/EmployeeMarker'
import NotificationBell from '@/features/notifications/NotificationBell'
import DashboardShell from '@/components/layout/DashboardShell'
import { useAuthStore } from '@/store/authStore'
import useLiveTracking from '@/api/useLiveTracking'
import { filterEmployees, departmentColor } from './utils/liveTrackingFilters'

const INDIA_CENTER = { lat: 22.5, lng: 78.5 }
const INDIA_ZOOM   = 5

const STATE_CENTERS = {
  'Maharashtra':      { lat: 19.7515, lng: 75.7139, zoom: 7 },
  'Madhya Pradesh':   { lat: 22.9734, lng: 78.6569, zoom: 7 },
  'Chhattisgarh':     { lat: 21.2787, lng: 81.8661, zoom: 7 },
  'Haryana':          { lat: 29.0588, lng: 76.0856, zoom: 8 },
  'Punjab':           { lat: 31.1471, lng: 75.3412, zoom: 8 },
  'Rajasthan':        { lat: 27.0238, lng: 74.2179, zoom: 7 },
  'Uttar Pradesh':    { lat: 26.8467, lng: 80.9462, zoom: 7 },
  'Gujarat':          { lat: 22.2587, lng: 71.1924, zoom: 7 },
  'Karnataka':        { lat: 15.3173, lng: 75.7139, zoom: 7 },
  'Andhra Pradesh':   { lat: 15.9129, lng: 79.7400, zoom: 7 },
  'Telangana':        { lat: 18.1124, lng: 79.0193, zoom: 8 },
  'Tamil Nadu':       { lat: 11.1271, lng: 78.6569, zoom: 7 },
  'West Bengal':      { lat: 22.9868, lng: 87.8550, zoom: 7 },
  'Bihar':            { lat: 25.0961, lng: 85.3131, zoom: 8 },
  'Delhi':            { lat: 28.7041, lng: 77.1025, zoom: 10 },
}

function MapViewportController({ target }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo({ lat: target.lat, lng: target.lng })
    if (target.zoom) map.setZoom(target.zoom)
  }, [map, target])
  return null
}

function summaryCounts(employees) {
  return employees.reduce(
    (acc, e) => {
      acc.total += 1
      if (e.status === 'online') acc.online += 1
      else if (e.status === 'stale') acc.stale += 1
      else acc.offline += 1
      return acc
    },
    { total: 0, online: 0, stale: 0, offline: 0 },
  )
}

function GeofenceBanner({ alerts }) {
  if (!alerts.length) return null
  const first = alerts[0]
  return (
    <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-amber-900 text-sm font-medium">
      Geofence Alert: {first.name} is outside assigned state near{' '}
      {first.current_location ?? `${first.lat.toFixed(3)}, ${first.lng.toFixed(3)}`}.
    </div>
  )
}

function StatusBadge({ employee }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
      employee.status === 'online'  ? 'text-emerald-700' :
      employee.status === 'stale'   ? 'text-amber-700'   : 'text-gray-500'
    }`}>
      <i className={`h-2 w-2 rounded-full ${employee.statusMeta.dotClass}`} aria-hidden="true" />
      {employee.statusMeta.label}
    </span>
  )
}

function StaffListItem({ employee, onLocate }) {
  const initials = String(employee.name ?? '')
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('')

  return (
    <li className="px-3 py-3 border-b border-outline-variant/15 last:border-0">
      <div className="flex items-start gap-3">
        <span
          className="h-9 w-9 rounded-full text-white text-xs font-black flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: employee.departmentColor }}
        >
          {initials || '??'}
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onLocate(employee)}
            className="text-sm font-bold text-on-surface hover:text-primary text-left truncate max-w-full"
          >
            {employee.name}
          </button>
          <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wide mt-0.5">
            {employee.department} · {employee.state}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <StatusBadge employee={employee} />
            <p className="text-[11px] text-on-surface-variant">
              {employee.last_seen
                ? formatDistanceToNow(new Date(employee.last_seen), { addSuffix: true })
                : 'No recent update'}
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

function SidebarContent({
  employees,
  search, setSearch,
  department, setDepartment,
  stateFilter, setStateFilter,
  onlyOnline, setOnlyOnline,
  stateOptions,
  departmentOptions,
  onLocate,
}) {
  return (
    <div className="h-full flex flex-col bg-surface-container-lowest">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/20 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-black font-headline text-on-surface">
            Field Force
            <span className="ml-2 text-base text-primary">({employees.length} active)</span>
          </p>
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">tune</span>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff or location..."
          className="w-full bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-sm"
          aria-label="Search staff"
        />

        <div className="grid grid-cols-1 gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-xs font-bold uppercase tracking-widest"
            aria-label="Department filter"
          >
            <option value="">All Departments</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-xs font-bold uppercase tracking-widest"
            aria-label="State filter"
          >
            <option value="">All States</option>
            {stateOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            <input
              type="checkbox"
              checked={onlyOnline}
              onChange={(e) => setOnlyOnline(e.target.checked)}
              className="h-4 w-4"
            />
            Show only online
          </label>
        </div>
      </div>

      {/* Staff list */}
      <ul className="overflow-y-auto flex-1" data-testid="live-tracking-sidebar-list">
        {employees.length === 0 ? (
          <li className="p-6 text-sm text-on-surface-variant text-center">
            No staff match the current filters.
          </li>
        ) : (
          employees.map((employee) => (
            <StaffListItem key={employee.user_id} employee={employee} onLocate={onLocate} />
          ))
        )}
      </ul>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveTrackingPage() {
  const user = useAuthStore((s) => s.user)
  const [search, setSearch]           = useState('')
  const [department, setDepartment]   = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [onlyOnline, setOnlyOnline]   = useState(false)
  const [focusTarget, setFocusTarget] = useState(null)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  const { employees, isLoading, isError, isRealtimeConnected, isPollingFallback, realtimeStatus } =
    useLiveTracking()

  // State dropdown: only states where staff are currently checked in (from GPS)
  const stateOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((e) => e.state).filter((s) => s && s !== '—'))).sort(),
    [employees],
  )

  // Department dropdown: built purely from live data
  const departmentOptions = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))),
    [employees],
  )

  const filteredEmployees = useMemo(
    () => filterEmployees(employees, { query: search, department, state: stateFilter, onlyOnline }),
    [employees, search, department, stateFilter, onlyOnline],
  )

  const summary = useMemo(() => summaryCounts(employees), [employees])

  const geofenceAlerts = useMemo(
    () => employees.filter(
      (e) => e.outside_state || (e.assigned_state && e.state && e.assigned_state !== e.state && e.state !== '—'),
    ),
    [employees],
  )

  // Pan map when state filter changes; also clear stale filter if state leaves the live list
  useEffect(() => {
    if (!stateFilter) return
    if (stateOptions.length && !stateOptions.includes(stateFilter)) {
      setStateFilter('')
      return
    }
    const center = STATE_CENTERS[stateFilter]
    if (center) {
      setFocusTarget(center)
    } else {
      const pinned = filteredEmployees.find((e) => e.lat !== 0 || e.lng !== 0)
      if (pinned) setFocusTarget({ lat: pinned.lat, lng: pinned.lng, zoom: 9 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, stateOptions])

  const sidebarProps = {
    employees: filteredEmployees,
    search, setSearch,
    department, setDepartment,
    stateFilter, setStateFilter,
    onlyOnline, setOnlyOnline,
    stateOptions,
    departmentOptions,
    onLocate: (employee) => setFocusTarget({ lat: employee.lat, lng: employee.lng, zoom: 15 }),
  }

  return (
    <DashboardShell>
      <GeofenceBanner alerts={geofenceAlerts} />

      {/* Top bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Live Tracking</p>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <span>Total: {summary.total}</span>
            <span className="text-emerald-700">Online: {summary.online}</span>
            <span className="text-amber-700">Stale: {summary.stale}</span>
            <span className="text-gray-600">Offline: {summary.offline}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {isRealtimeConnected
              ? 'Realtime connected'
              : isPollingFallback
              ? 'Polling fallback active'
              : `Realtime status: ${realtimeStatus}`}
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="relative h-[calc(100vh-120px)] min-h-[560px]">
        <div className="absolute inset-0">
          <GoogleMapProvider fallbackClassName="h-full">
            <Map defaultCenter={INDIA_CENTER} defaultZoom={INDIA_ZOOM} gestureHandling="greedy">
              <MapViewportController target={focusTarget} />
              {filteredEmployees.map((employee) => (
                <EmployeeMarker
                  key={employee.user_id}
                  employee={employee}
                  onClick={() => setFocusTarget({ lat: employee.lat, lng: employee.lng, zoom: 15 })}
                />
              ))}
            </Map>
          </GoogleMapProvider>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:flex absolute left-4 top-4 bottom-4 w-[340px] shadow-ghost overflow-hidden z-10">
          <SidebarContent {...sidebarProps} />
        </aside>

        {/* Mobile bottom sheet */}
        <div className="md:hidden absolute left-3 right-3 bottom-3 z-20">
          <button
            type="button"
            onClick={() => setIsMobileSheetOpen((p) => !p)}
            className="w-full px-4 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest"
          >
            {isMobileSheetOpen ? 'Hide Staff Panel' : 'Show Staff Panel'}
          </button>

          {isMobileSheetOpen && (
            <div className="mt-2 max-h-[62vh] shadow-ghost overflow-hidden rounded-sm">
              <SidebarContent
                {...sidebarProps}
                onLocate={(employee) => {
                  setFocusTarget({ lat: employee.lat, lng: employee.lng, zoom: 15 })
                  setIsMobileSheetOpen(false)
                }}
              />
            </div>
          )}
        </div>

        {/* Loading / error overlay */}
        {(isLoading || isError) && (
          <div className="absolute top-4 right-4 bg-surface-container-lowest shadow-ghost px-4 py-2 text-sm z-10">
            {isLoading
              ? 'Loading live employee positions…'
              : 'Failed to load live employee positions.'}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
