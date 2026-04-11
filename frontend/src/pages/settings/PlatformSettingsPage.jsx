import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import apiClient from '@/lib/axios'
import { settingsNavItems } from '@/pages/dashboard/dashboardNav'

function buildMockSettingsData() {
  return {
    profile: {
      name: 'Arjun Deshmukh',
      role: 'Senior Agronomist',
      department: 'Precision Agriculture',
      mobile: '+91 98200 45XXX',
      state: 'Maharashtra',
      ppkId: 'PS-MH-2024-001',
      initials: 'AD',
    },
    systemStatus: {
      state: 'operational',
      apiLatency: '42ms',
      lastSync: '2 mins ago',
      version: 'Version 2.4.1 (Stable)',
    },
    preferences: {
      language: 'english',
      alerts: {
        crop: true,
        logistics: true,
        marketing: false,
      },
    },
    directory: [
      {
        id: 'u-1',
        name: 'Rohan Kulkarni',
        email: 'rohan.k@prabhuseeds.com',
        role: 'Field Manager',
        deptState: 'Operations / Gujarat',
        status: 'active',
        initials: 'RK',
      },
      {
        id: 'u-2',
        name: 'Snehal Patil',
        email: 'snehal.p@prabhuseeds.com',
        role: 'Logistics Head',
        deptState: 'Supply Chain / Karnataka',
        status: 'active',
        initials: 'SP',
      },
      {
        id: 'u-3',
        name: 'Amit Mehra',
        email: 'amit.m@prabhuseeds.com',
        role: 'Analyst',
        deptState: 'Crop Intelligence / Punjab',
        status: 'pending',
        initials: 'AM',
      },
    ],
  }
}

function normalizeSettings(payload) {
  if (!payload || typeof payload !== 'object') return null

  return {
    profile: payload.profile ?? buildMockSettingsData().profile,
    systemStatus: payload.systemStatus ?? payload.system_status ?? buildMockSettingsData().systemStatus,
    preferences: payload.preferences ?? buildMockSettingsData().preferences,
    directory: Array.isArray(payload.directory) && payload.directory.length
      ? payload.directory
      : buildMockSettingsData().directory,
  }
}

async function fetchPlatformSettings() {
  try {
    const response = await apiClient.get('/api/v1/settings/platform')
    return normalizeSettings(response.data) ?? buildMockSettingsData()
  } catch {
    return buildMockSettingsData()
  }
}

export default function PlatformSettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ['platform-settings'],
    queryFn: fetchPlatformSettings,
    placeholderData: (prev) => prev,
  })

  const settings = settingsQuery.data ?? buildMockSettingsData()
  const [language, setLanguage] = useState(settings.preferences.language)
  const [alerts, setAlerts] = useState(settings.preferences.alerts)

  const tabs = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'logistics', label: 'Logistics' },
    ],
    []
  )

  function toggleAlert(alertKey) {
    setAlerts((current) => ({
      ...current,
      [alertKey]: !current[alertKey],
    }))
  }

  return (
    <DashboardShell
      brandTitle="Prabhu Seeds"
      brandSubtitle="Agritask Platform"
      navItems={settingsNavItems}
      topbar={
        <DashboardTopbar
          left={
            <div className="flex items-center gap-4 text-xs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`h-8 px-2 border-b-2 ${tab.id === 'dashboard' ? 'border-primary text-primary font-semibold' : 'border-transparent text-on-surface-variant'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
          right={
            <>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center text-on-surface-variant" aria-label="Notifications">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notifications</span>
              </button>
              <button type="button" className="h-7 w-7 inline-flex items-center justify-center text-primary border-b-2 border-primary" aria-label="Settings">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">settings</span>
              </button>
              <span className="h-7 w-7 rounded-sm bg-primary-container text-on-primary text-[11px] font-bold inline-flex items-center justify-center">AD</span>
            </>
          }
        />
      }
    >
      <div className="max-w-6xl mx-auto space-y-4">
        <section>
          <h1 className="text-4xl font-black font-headline text-on-surface">System Settings</h1>
          <p className="text-sm text-on-surface-variant mt-1">Manage your platform profile, preferences, and organization access.</p>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
          <div className="space-y-3">
            <article className="bg-surface-container-lowest border-l-4 border-primary p-4">
              <div className="flex flex-col items-center text-center">
                <span className="h-16 w-16 rounded-sm bg-surface-container-high text-on-surface text-xl font-black inline-flex items-center justify-center">{settings.profile.initials}</span>
                <h2 className="text-2xl font-black font-headline mt-3">{settings.profile.name}</h2>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mt-1">{settings.profile.role}</p>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Department</dt>
                  <dd className="font-semibold text-right">{settings.profile.department}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Mobile</dt>
                  <dd className="font-semibold text-right">{settings.profile.mobile}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">State</dt>
                  <dd className="font-semibold text-right">{settings.profile.state}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">PPK ID</dt>
                  <dd className="font-mono text-xs bg-surface-container-low px-2 py-1">{settings.profile.ppkId}</dd>
                </div>
              </dl>
            </article>

            <article className="bg-surface-container-lowest p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black uppercase tracking-[0.14em]">System Status</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {settings.systemStatus.state}
                </span>
              </div>

              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">API Latency</dt>
                  <dd className="font-mono">{settings.systemStatus.apiLatency}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">Last Sync</dt>
                  <dd className="font-mono">{settings.systemStatus.lastSync}</dd>
                </div>
              </dl>
            </article>

            <article className="bg-surface-container-lowest p-4">
              <h3 className="text-xl font-black font-headline">About Platform</h3>
              <p className="text-sm text-on-surface-variant mt-2">{settings.systemStatus.version}</p>
              <div className="mt-4 space-y-2 text-sm text-on-surface">
                <button type="button" className="block hover:text-primary">Privacy Policy</button>
                <button type="button" className="block hover:text-primary">Terms of Service</button>
                <button type="button" className="block hover:text-primary">Security Audit Reports</button>
              </div>
            </article>
          </div>

          <div className="space-y-3">
            <article className="bg-surface-container-lowest p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">tune</span>
                <h3 className="text-2xl font-black font-headline">User Preferences</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant mb-2">Preferred Language</p>
                  <div className="inline-flex bg-surface-container-low p-0.5">
                    <button
                      type="button"
                      onClick={() => setLanguage('english')}
                      className={`h-8 px-4 text-sm font-semibold ${language === 'english' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant'}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('hindi')}
                      className={`h-8 px-4 text-sm font-semibold ${language === 'hindi' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant'}`}
                    >
                      Hindi (\u0939\u093f\u0928\u094d\u0926\u0940)
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant mb-2">Alert Preferences</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={alerts.crop} onChange={() => toggleAlert('crop')} />
                      Critical Crop Health Alerts
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={alerts.logistics} onChange={() => toggleAlert('logistics')} />
                      Logistics & Supply Updates
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={alerts.marketing} onChange={() => toggleAlert('marketing')} />
                      Marketing & Newsletter
                    </label>
                  </div>
                </div>
              </div>
            </article>

            <article className="bg-surface-container-lowest p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-2xl font-black font-headline">User Directory</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Restricted to organization owners only</p>
                </div>

                <button type="button" className="h-8 px-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">person_add</span>
                  Add Member
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[620px] w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container-low text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                      <th className="px-3 py-3 text-left">Member</th>
                      <th className="px-3 py-3 text-left">Role</th>
                      <th className="px-3 py-3 text-left">Dept/State</th>
                      <th className="px-3 py-3 text-left">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {settings.directory.map((member) => (
                      <tr key={member.id} className="border-t border-outline-variant/15">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 bg-surface-container-low text-[10px] font-bold inline-flex items-center justify-center">{member.initials}</span>
                            <div>
                              <p className="font-semibold">{member.name}</p>
                              <p className="text-[10px] text-on-surface-variant">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">{member.role}</td>
                        <td className="px-3 py-3 text-on-surface-variant">{member.deptState}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${member.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-tertiary/15 text-tertiary'}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button type="button" className="h-7 w-7 inline-flex items-center justify-center" aria-label={`Actions for ${member.name}`}>
                            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
