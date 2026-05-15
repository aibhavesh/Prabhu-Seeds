import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { getDashboardRoute } from '@/lib/navConfig'

export default function MobileInputPage() {
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const isValid = mobile.length === 10 && password.length >= 6

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || loading) return

    setLoading(true)
    try {
      const { data } = await apiClient.post('/api/v1/auth/login', {
        mobile: `+91${mobile}`,
        password,
      })
      setAuth(data.user, data.token)
      toast.success(`Welcome, ${data.user.name}!`)
      navigate(getDashboardRoute(data.user.role), { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.response?.data?.message ?? 'Login failed'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <main className="w-full max-w-[400px] flex flex-col gap-8 z-10">
        <div className="text-center space-y-1">
          <h1 className="text-[24px] font-bold text-primary-container leading-none">Prabhu Seeds</h1>
          <p className="text-[14px] font-medium text-on-surface-variant tracking-wide">PGA AgriTask</p>
        </div>

        <div className="bg-surface-container-lowest p-6 border border-outline-variant/15 shadow-ghost rounded-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Mobile */}
            <div className="space-y-2">
              <label
                htmlFor="mobile"
                className="block text-[14px] font-bold text-on-surface uppercase tracking-wider"
              >
                Mobile Number
              </label>
              <div className="flex items-stretch rounded-sm overflow-hidden border border-outline-variant/30 focus-within:border-primary transition-colors">
                <span className="flex items-center px-4 bg-surface-container-low text-on-surface-variant font-semibold text-sm border-r border-outline-variant/30 select-none">
                  +91
                </span>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10 digit number"
                  className="w-full px-4 py-3 bg-transparent text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 border-none text-sm font-medium"
                  autoComplete="tel-national"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[14px] font-bold text-on-surface uppercase tracking-wider"
              >
                Password
              </label>
              <div className="flex items-stretch rounded-sm overflow-hidden border border-outline-variant/30 focus-within:border-primary transition-colors">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-transparent text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 border-none text-sm font-medium"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex items-center px-3 bg-surface-container-low text-on-surface-variant border-l border-outline-variant/30 hover:text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full h-10 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-sm rounded-sm shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              ) : (
                <>
                  Login
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        </div>

        <footer className="text-center">
          <nav className="flex justify-center gap-6 text-[12px] font-medium text-on-surface-variant">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span className="text-outline-variant/30" aria-hidden="true">•</span>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
          </nav>
          <p className="mt-4 text-[10px] text-on-surface-variant/40 font-medium uppercase tracking-[0.1em]">
            &copy; 2024 PRABHU SEEDS PRIVATE LIMITED
          </p>
        </footer>
      </main>

      <div className="fixed inset-0 -z-10 pointer-events-none opacity-[0.03] flex items-center justify-center">
        <div className="w-[120%] h-[120%] rotate-12 bg-grid-faint" />
      </div>
    </div>
  )
}
