/**
 * Single source of truth for navigation and role-based access.
 * Every sidebar in the app is generated from NAV_BY_ROLE.
 * Every route guard checks ROUTE_ROLES.
 */

export const NAV_BY_ROLE = {
  owner: [
    { label: 'Dashboard',     icon: 'dashboard',       to: '/dashboard/owner' },
    { label: 'Tasks',         icon: 'assignment',      to: '/tasks' },
    { label: 'Attendance',    icon: 'event_available', to: '/attendance' },
    { label: 'Live Tracking', icon: 'map',             to: '/tracking/live' },
    { label: 'Travel',        icon: 'distance',        to: '/travel' },
    { label: 'Leave',         icon: 'event_busy',      to: '/leave/manage' },
    { label: 'Settings',      icon: 'settings',        to: '/settings/platform' },
  ],
  manager: [
    { label: 'Dashboard',     icon: 'dashboard',       to: '/dashboard/manager' },
    { label: 'Tasks',         icon: 'assignment',      to: '/tasks' },
    { label: 'Attendance',    icon: 'event_available', to: '/attendance' },
    { label: 'Live Tracking', icon: 'map',             to: '/tracking/live' },
    { label: 'Travel',        icon: 'distance',        to: '/travel' },
    { label: 'Leave',         icon: 'event_busy',      to: '/leave/manage' },
  ],
  field: [
    { label: 'Dashboard',  icon: 'dashboard',       to: '/dashboard/field' },
    { label: 'Tasks',      icon: 'assignment',      to: '/tasks' },
    { label: 'Attendance', icon: 'event_available', to: '/attendance' },
    { label: 'My Travel',  icon: 'distance',        to: '/travel/history' },
    { label: 'My Leave',   icon: 'event_busy',      to: '/leave' },
  ],
  accounts: [
    { label: 'Dashboard',      icon: 'dashboard',  to: '/dashboard/accounts' },
    { label: 'Travel Claims',  icon: 'distance',   to: '/travel' },
    { label: 'Leave',          icon: 'event_busy', to: '/leave/manage' },
  ],
}

/** Returns the dashboard URL for a given role string (case-insensitive). */
export function getDashboardRoute(role) {
  const map = {
    owner:    '/dashboard/owner',
    manager:  '/dashboard/manager',
    field:    '/dashboard/field',
    accounts: '/dashboard/accounts',
  }
  return map[role?.toLowerCase()] ?? '/dashboard/field'
}

/**
 * Which roles are allowed on each route prefix.
 * Checked by authGuard — most specific prefix wins.
 */
export const ROUTE_ROLES = {
  '/dashboard/owner':    ['owner'],
  '/dashboard/manager':  ['manager'],
  '/dashboard/field':    ['field'],
  '/dashboard/accounts': ['accounts'],
  '/settings/platform':  ['owner'],
  '/tracking/live':      ['owner', 'manager'],
  '/leave/manage':       ['owner', 'manager', 'accounts'],
  '/travel/history':     ['field'],
  '/travel':             ['owner', 'manager', 'accounts'],
  '/tasks':              ['owner', 'manager', 'field'],
  '/attendance':         ['owner', 'manager', 'field'],
  '/leave':              ['owner', 'manager', 'field', 'accounts'],
}
