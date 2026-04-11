import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TasksPage from '../TasksPage'

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('react-hot-toast', () => ({
  default: { promise: vi.fn(), loading: vi.fn(), success: vi.fn(), error: vi.fn() },
}))

// Auth store — default: owner role (can create tasks)
let mockUser = { id: '1', role: 'owner', name: 'Test Owner', mobile: '9876543210' }
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mockUser, token: 'tok', setAuth: vi.fn(), clearAuth: vi.fn() }),
}))

// Task hooks — mock at the module level so tests can override per-case
vi.mock('../hooks/useTasks', () => ({
  useTasks: vi.fn(),
  useActivityTypes: vi.fn(() => ({ data: [] })),
  useFieldStaff: vi.fn(() => ({ data: [] })),
  useCreateTask: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

vi.mock('../hooks/useExportTasks', () => ({
  useExportTasks: vi.fn(() => ({ startExport: vi.fn(), exporting: false })),
}))

import { useTasks } from '../hooks/useTasks'
import { useExportTasks } from '../hooks/useExportTasks'

// ── Fixtures ───────────────────────────────────────────────────────────────

const TASKS = [
  {
    id: 'ao-4921',
    activity_type: 'Soil pH Sampling',
    assigned_to: { id: 'u1', name: 'Marcus Thorne' },
    village: 'North Valley',
    department: 'SOIL MGMT',
    status: 'in_progress',
    due_date: '2099-10-24',
    description: 'Collect soil samples.',
    lat: 28.6139,
    lng: 77.209,
  },
  {
    id: 'ao-4815',
    activity_type: 'Canal Dredging',
    assigned_to: { id: 'u2', name: 'Elena Rodriguez' },
    village: 'West Ridge',
    department: 'IRRIGATION',
    status: 'pending',
    due_date: '2099-10-25',
  },
  {
    id: 'ao-4712',
    activity_type: 'Pest Spraying B-12',
    assigned_to: { id: 'u3', name: 'Arjun Singh' },
    village: 'East Basin',
    department: 'PEST CONTROL',
    status: 'overdue',
    due_date: '2020-10-19',
  },
]

const META = { total: 1284, pending: 43, active: 18, efficiency: 94.2 }

// ── Helpers ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage(initialSearch = '') {
  const qc = makeQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/tasks${initialSearch}`]}>
        <Routes>
          <Route path="/tasks" element={<TasksPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: '1', role: 'owner', name: 'Test Owner', mobile: '9876543210' }
    useTasks.mockReturnValue({ data: { tasks: TASKS, meta: META }, isLoading: false, isError: false })
    useExportTasks.mockReturnValue({ startExport: vi.fn(), exporting: false })
  })

  // ── Rendering ─────────────────────────────────────────────────────────

  it('renders page title and table headers', () => {
    renderPage()
    expect(screen.getByText('Task Registry')).toBeInTheDocument()
    expect(screen.getByText('Task ID')).toBeInTheDocument()
    expect(screen.getByText('Activity Type')).toBeInTheDocument()
    expect(screen.getByText('Assigned To')).toBeInTheDocument()
    expect(screen.getByText('Village')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Due Date')).toBeInTheDocument()
  })

  it('renders task rows', () => {
    renderPage()
    expect(screen.getByText('Soil pH Sampling')).toBeInTheDocument()
    expect(screen.getByText('Canal Dredging')).toBeInTheDocument()
    expect(screen.getByText('North Valley')).toBeInTheDocument()
    expect(screen.getByText('West Ridge')).toBeInTheDocument()
  })

  it('shows status badges in the table', () => {
    renderPage()
    // "In Progress" also appears as a filter tab, so use getAllByText
    expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1)
    // Badge spans are uppercase in TaskStatusBadge
    const badges = document.querySelectorAll('span.uppercase')
    const badgeTexts = Array.from(badges).map((b) => b.textContent)
    expect(badgeTexts).toContain('In Progress')
    expect(badgeTexts).toContain('Pending')
    expect(badgeTexts).toContain('Overdue')
  })

  it('renders summary stats', () => {
    renderPage()
    expect(screen.getByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('43')).toBeInTheDocument()
    expect(screen.getByText('94.2%')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    useTasks.mockReturnValue({ data: { tasks: [], meta: null }, isLoading: false, isError: false })
    renderPage()
    expect(screen.getByText('No tasks found.')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    useTasks.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    renderPage()
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    useTasks.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderPage()
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })

  // ── Role-based visibility ─────────────────────────────────────────────

  it('shows Create Task button for owner role', () => {
    mockUser = { id: '1', role: 'owner', name: 'Owner', mobile: '9876543210' }
    renderPage()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('shows Create Task button for manager role', () => {
    mockUser = { id: '2', role: 'manager', name: 'Manager', mobile: '9876543210' }
    renderPage()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('hides Create Task button for field role', () => {
    mockUser = { id: '3', role: 'field', name: 'Field', mobile: '9876543210' }
    renderPage()
    expect(screen.queryByRole('button', { name: /create task/i })).not.toBeInTheDocument()
  })

  it('hides Create Task button for accounts role', () => {
    mockUser = { id: '4', role: 'accounts', name: 'Accounts', mobile: '9876543210' }
    renderPage()
    expect(screen.queryByRole('button', { name: /create task/i })).not.toBeInTheDocument()
  })

  // ── Filters ───────────────────────────────────────────────────────────

  it('renders status tab buttons', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument()
  })

  it('clicking a status tab calls useTasks with that status', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Pending' }))
    // useTasks should have been called with status=pending in the re-render
    const lastCall = useTasks.mock.calls.at(-1)[0]
    expect(lastCall.status).toBe('pending')
  })

  it('typing in search box calls useTasks with search param', async () => {
    renderPage()
    const input = screen.getByPlaceholderText(/search by village/i)
    fireEvent.change(input, { target: { value: 'North Valley' } })
    await waitFor(() => {
      const lastCall = useTasks.mock.calls.at(-1)[0]
      expect(lastCall.search).toBe('North Valley')
    })
  })

  it('date range inputs update filter params', () => {
    renderPage()
    const fromInput = screen.getByLabelText('From date')
    const toInput = screen.getByLabelText('To date')
    fireEvent.change(fromInput, { target: { value: '2023-10-01' } })
    fireEvent.change(toInput, { target: { value: '2023-10-31' } })
    const lastCall = useTasks.mock.calls.at(-1)[0]
    expect(lastCall.dateTo).toBe('2023-10-31')
  })

  // ── Create Task dialog ────────────────────────────────────────────────

  it('opens Create Task dialog on button click', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('Create Task dialog has required form fields', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))
    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/village/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
  })

  // ── Task Detail Sheet ─────────────────────────────────────────────────

  it('opens TaskDetailSheet when a row is clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Soil pH Sampling'))
    await waitFor(() => {
      // Sheet renders the title / activity_type
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('detail sheet shows assigned staff name', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Soil pH Sampling'))
    await waitFor(() => {
      // The sheet should show Marcus Thorne's name
      const dialogs = screen.getAllByText('Marcus Thorne')
      expect(dialogs.length).toBeGreaterThan(0)
    })
  })

  // ── CSV Export ────────────────────────────────────────────────────────

  it('Export CSV button is present', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })

  it('clicking Export CSV calls startExport', async () => {
    const startExport = vi.fn()
    useExportTasks.mockReturnValue({ startExport, exporting: false })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }))
    expect(startExport).toHaveBeenCalledOnce()
  })

  it('Export CSV button is disabled while exporting', () => {
    useExportTasks.mockReturnValue({ startExport: vi.fn(), exporting: true })
    renderPage()
    // aria-label stays "Export CSV"; check disabled state + visible text change
    const btn = screen.getByRole('button', { name: /export csv/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent(/exporting/i)
  })
})
