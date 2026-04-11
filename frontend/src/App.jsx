import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { queryClient } from '@/lib/queryClient'
import { authGuard } from '@/lib/authGuard'
import MobileInputPage from '@/pages/auth/MobileInputPage'
import OTPVerifyPage from '@/pages/auth/OTPVerifyPage'
import OwnerDashboardPage from '@/pages/dashboard/OwnerDashboardPage'
import ManagerDashboardPage from '@/pages/dashboard/ManagerDashboardPage'
import FieldStaffDashboardPage from '@/pages/dashboard/FieldStaffDashboardPage'
import AccountsDashboardPage from '@/pages/dashboard/AccountsDashboardPage'
import PlatformSettingsPage from '@/pages/settings/PlatformSettingsPage'
import TasksPage from '@/pages/tasks/TasksPage'
import AttendanceOverviewPage from '@/pages/attendance/AttendanceOverviewPage'
import AttendanceDetailPage from '@/pages/attendance/AttendanceDetailPage'
import LeaveManagementPage from '@/pages/leave/LeaveManagementPage'
import MyLeavesPage from '@/pages/leave/MyLeavesPage'
import TravelClaimsPage from '@/pages/travel/TravelClaimsPage'
import TravelHistoryPage from '@/pages/travel/TravelHistoryPage'
import LiveTrackingPage from '@/pages/tracking/LiveTrackingPage'

const router = createBrowserRouter([
  // Public routes
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <MobileInputPage /> },
  { path: '/auth/verify', element: <OTPVerifyPage /> },

  // Protected routes — each guarded by authGuard loader
  {
    path: '/dashboard/owner',
    loader: authGuard,
    element: <OwnerDashboardPage />,
  },
  {
    path: '/dashboard/manager',
    loader: authGuard,
    element: <ManagerDashboardPage />,
  },
  {
    path: '/dashboard/field',
    loader: authGuard,
    element: <FieldStaffDashboardPage />,
  },
  {
    path: '/dashboard/accounts',
    loader: authGuard,
    element: <AccountsDashboardPage />,
  },
  {
    path: '/settings/platform',
    loader: authGuard,
    element: <PlatformSettingsPage />,
  },
  {
    path: '/tasks',
    loader: authGuard,
    element: <TasksPage />,
  },
  {
    path: '/attendance',
    loader: authGuard,
    element: <AttendanceOverviewPage />,
  },
  {
    path: '/attendance/:staffId/track',
    loader: authGuard,
    element: <AttendanceDetailPage />,
  },
  {
    path: '/travel',
    loader: authGuard,
    element: <TravelClaimsPage />,
  },
  {
    path: '/travel/history',
    loader: authGuard,
    element: <TravelHistoryPage />,
  },
  {
    path: '/leave/manage',
    loader: authGuard,
    element: <LeaveManagementPage />,
  },
  {
    path: '/leave',
    loader: authGuard,
    element: <MyLeavesPage />,
  },
  {
    path: '/tracking/live',
    loader: authGuard,
    element: <LiveTrackingPage />,
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}
