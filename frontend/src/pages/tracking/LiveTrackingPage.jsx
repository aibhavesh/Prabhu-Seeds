import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Map, useMap } from '@vis.gl/react-google-maps'
import GoogleMapProvider from '@/components/maps/GoogleMapProvider'
import EmployeeMarker from '@/components/maps/EmployeeMarker'
import NotificationBell from '@/features/notifications/NotificationBell'
import DashboardShell from '@/components/layout/DashboardShell'
import { useAuthStore } from '@/store/authStore'
import useLiveTracking from '@/api/useLiveTracking'
import { filterEmployees } from './utils/liveTrackingFilters'

const INDIA_CENTER = { lat: 22.5, lng: 78.5 }
const INDIA_ZOOM = 5

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
    (acc, employee) => {
      acc.total += 1
      if (employee.status === 'online') acc.online += 1
      else if (employee.status === 'stale') acc.stale += 1
      else acc.offline += 1
      return acc
    },
    { total: 0, online: 0, stale: 0, offline: 0 }
  )
}

function GeofenceBanner({ alerts }) {
  if (!alerts.length) return null

  const first = alerts[0]
  return (
    <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-amber-900 text-sm font-medium">
      Geofence Alert: {first.name} is outside assigned state near {first.current_location ?? `${first.lat.toFixed(3)}, ${first.lng.toFixed(3)}`}.
    </div>
  )
}

function StatusBadge({ employee }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${employee.status === 'online' ? 'text-emerald-700' : employee.status === 'stale' ? 'text-amber-700' : 'text-gray-500'}`}>
      <i className={`h-2 w-2 rounded-full ${employee.statusMeta.dotClass}`} />
      {employee.statusMeta.label}
    </span>
  )
}

function StaffListItem({ employee, onLocate }) {
  const initials = String(employee.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <li className="px-3 py-3 border-b border-outline-variant/15">
      <div className="flex items-start gap-3">
        <span
          className="h-9 w-9 rounded-full text-white text-xs font-black flex items-center justify-center"
          style={{ backgroundColor: employee.departmentColor }}
        >
          {initials || '??'}
        </span>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onLocate(employee)}
            className="text-sm font-bold text-on-surface hover:text-primary text-left"
          >
            {employee.name}
          </button>
          <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wide">
            {employee.department} · {employee.state}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <StatusBadge employee={employee} />
            <p className="text-[11px] text-on-surface-variant">
              {employee.last_seen ? formatDistanceToNow(new Date(employee.last_seen), { addSuffix: true }) : 'No recent update'}
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

function SidebarContent({
  employees,
  search,
  setSearch,
  department,
  setDepartment,
  stateFilter,
  setStateFilter,
  onlyOnline,
  setOnlyOnline,
  onLocate,
}) {
  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))), [employees])
  const states = useMemo(() => Array.from(new Set(employees.map((e) => e.state).filter(Boolean))), [employees])

  return (
    <div className="h-full flex flex-col bg-surface-container-lowest">
      <div className="px-4 py-3 border-b border-outline-variant/20 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-black font-headline text-on-surface">Field Force <span className="text-base text-primary">({employees.length} active)</span></p>
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
            {departments.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/20 px-3 py-2 text-xs font-bold uppercase tracking-widest"
            aria-label="State filter"
          >
            <option value="">All States</option>
            {states.map((item) => (
              <option key={item} value={item}>{item}</option>
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

      <ul className="overflow-y-auto flex-1" data-testid="live-tracking-sidebar-list">
        {employees.map((employee) => (
          <StaffListItem key={employee.user_id} employee={employee} onLocate={onLocate} />
        ))}
      </ul>
    </div>
  )
}

export default function LiveTrackingPage() {
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [onlyOnline, setOnlyOnline] = useState(false)
  const [focusTarget, setFocusTarget] = useState(null)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  const allowed = user?.role === 'owner' || user?.role === 'manager'

  const { employees, isLoading, isError, isRealtimeConnected, isPollingFallback, realtimeStatus } = useLiveTracking()

  const filteredEmployees = useMemo(
    () =>
      filterEmployees(employees, {
        query: search,
        department,
        state: stateFilter,
        onlyOnline,
      }),
    [employees, search, department, stateFilter, onlyOnline]
  )

  const summary = useMemo(() => summaryCounts(employees), [employees])

  const geofenceAlerts = useMemo(
    () => employees.filter((employee) => employee.outside_state || (employee.assigned_state && employee.state && employee.assigned_state !== employee.state)),
    [employees]
  )

  if (!allowed) {
  return (
    <DashboardShell>
      <GeofenceBanner alerts={geofenceAlerts} />

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
            {isRealtimeConnected ? 'Realtime connected' : isPollingFallback ? 'Polling fallback active' : `Realtime status: ${realtimeStatus}`}
          </div>
          <NotificationBell />
        </div>
      </div>

      <div className="relative h-[calc(100vh-120px)] min-h-[560px]">
        <div className="absolute inset-0">
          <GoogleMapProvider fallbackClassName="h-full">
            <Map
              defaultCenter={INDIA_CENTER}
              defaultZoom={INDIA_ZOOM}
              mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
              gestureHandling="greedy"
            >
              <MapViewportController target={focusTarget} />
              {filteredEmployees.map((employee) => (
                <EmployeeMarker
                  key={employee.user_id}
                  employee={employee}
                  onClick={() => {
                    setFocusTarget({ lat: employee.lat, lng: employee.lng, zoom: 15 })
                  }}
                />
              ))}
            </Map>
          </GoogleMapProvider>
        </div>

        <aside className="hidden md:flex absolute left-4 top-4 bottom-4 w-[340px] shadow-ghost overflow-hidden">
          <SidebarContent
            employees={filteredEmployees}
            search={search}
            setSearch={setSearch}
            department={department}
            setDepartment={setDepartment}
            stateFilter={stateFilter}
            setStateFilter={setStateFilter}
            onlyOnline={onlyOnline}
            setOnlyOnline={setOnlyOnline}
            onLocate={(employee) => {
              setFocusTarget({ lat: employee.lat, lng: employee.lng, zoom: 15 })
            }}
          />
        </aside>

        <div className="md:hidden absolute left-3 right-3 bottom-3 z-20">
          <button
            type="button"
            onClick={() => setIsMobileSheetOpen((prev) => !prev)}
            className="w-full px-4 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest"
          >
            {isMobileSheetOpen ? 'Hide Staff Panel' : 'Show Staff Panel'}
          </button>

          {isMobileSheetOpen && (
            <div className="mt-2 max-h-[62vh] shadow-ghost overflow-hidden rounded-sm">
              <SidebarContent
                employees={filteredEmployees}
                search={search}
                setSearch={setSearch}
                department={department}
                setDepartment={setDepartment}
                stateFilter={stateFilter}
                setStateFilter={setStateFilter}
                onlyOnline={onlyOnline}
                setOnlyOnline={setOnlyOnline}
                onLocate={(employee) => {
                  setFocusTarget({ lat: employee.lat, lng: employee.lng, zoom: 15 })
                  setIsMobileSheetOpen(false)
                }}
              />
            </div>
          )}
        </div>

        {(isLoading || isError) && (
          <div className="absolute top-4 right-4 bg-surface-container-lowest shadow-ghost px-4 py-2 text-sm">
            {isLoading ? 'Loading live employee positions...' : 'Failed to load live employee positions.'}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
