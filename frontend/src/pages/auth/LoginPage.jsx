import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { googleLogin, login } from '../../api/auth'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import useAuth from '../../hooks/useAuth'
import { getGoogleIdentityToken } from '../../lib/firebase'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  
  // States: null (unselected), 'farmer', 'other'
  const [roleType, setRoleType] = useState(null)
  
  // If 'other', we need to decide between buyer/logistics
  const [specificRole, setSpecificRole] = useState(null)

  const selectedRole = roleType === 'farmer' ? 'farmer' : specificRole
  const isFarmer = roleType === 'farmer'

  const completeAuth = (data) => {
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    setUser(data.user)
    navigate(`/${data.user.role}/dashboard`)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const formData = new FormData(event.currentTarget)
      const payload = Object.fromEntries(formData.entries())

      if (isFarmer) {
        const mobile = String(payload.mobile || '').trim()
        if (!mobile || mobile.length < 10) {
          setError('Please enter a valid 10-digit mobile number.')
          return
        }
        payload.email = mobile
        delete payload.mobile
      } else {
        payload.email = String(payload.email || '').trim().toLowerCase()
      }

      const { data } = await login(payload)
      completeAuth(data)
    } catch (err) {
      const details = err?.response?.data
      if (!err?.response) {
        setError('Cannot reach backend. Start Django server at localhost:8000.')
      } else if (typeof details === 'string') {
        setError(details)
      } else if (details?.detail) {
        setError(details.detail)
      } else {
        const first = details && typeof details === 'object' ? Object.values(details)[0] : null
        setError(Array.isArray(first) ? first[0] : first || 'Invalid credentials')
      }
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      const { idToken } = await getGoogleIdentityToken()
      const { data } = await googleLogin(idToken)
      completeAuth(data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Google sign-in failed.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-2 font-display text-4xl text-text-primary text-center">Login</h1>
      <p className="mb-8 text-sm text-text-muted text-center italic font-medium">Connecting Bharat's Farmers directly to the Market.</p>

      {/* ── Step 1: Are you a farmer? ─────────────────────────── */}
      {!roleType ? (
        <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-lg font-bold text-text-primary text-center mb-1">Welcome! Who are you?</p>
          <div className="grid gap-3">
            <button
              onClick={() => setRoleType('farmer')}
              className="group flex items-center justify-between rounded-xl border-2 border-accent/20 bg-white p-5 transition-all hover:border-accent hover:bg-accent/[0.02]"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🌾</span>
                <div className="text-left">
                  <p className="font-bold text-text-primary uppercase tracking-wide">I am a Farmer</p>
                  <p className="text-xs text-text-muted">Login with your mobile number</p>
                </div>
              </div>
              <span className="text-accent transition-transform group-hover:translate-x-1">→</span>
            </button>

            <button
              onClick={() => setRoleType('other')}
              className="group flex items-center justify-between rounded-xl border-2 border-border bg-white p-5 transition-all hover:border-accent/40"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">🤝</span>
                <div className="text-left">
                  <p className="font-bold text-text-primary uppercase tracking-wide">I am a Buyer/Partner</p>
                  <p className="text-xs text-text-muted">Login with email or Google</p>
                </div>
              </div>
              <span className="text-text-muted group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-text-muted">
            New here? <a href="/register" className="text-accent font-semibold underline">Register here</a>
          </p>
        </div>
      ) : roleType === 'other' && !specificRole ? (
        /* ── Step 1b: If not farmer, choose specific role ───── */
        <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <button onClick={() => setRoleType(null)} className="text-xs text-accent underline text-left mb-2">← Back</button>
          <p className="text-lg font-bold text-text-primary text-center mb-1">Are you a...</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSpecificRole('buyer')} className="rounded-xl border border-border bg-white p-6 text-center hover:border-accent transition-all">
              <span className="text-3xl block mb-2">🛒</span>
              <p className="font-bold text-sm">Buyer</p>
            </button>
            <button onClick={() => setSpecificRole('logistics')} className="rounded-xl border border-border bg-white p-6 text-center hover:border-accent transition-all">
              <span className="text-3xl block mb-2">🚛</span>
              <p className="font-bold text-sm">Logistics</p>
            </button>
          </div>
        </div>
      ) : (
        /* ── Step 2: Login form ─────────────────────────────── */
        <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-border bg-surface p-8 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-base font-black text-text-primary uppercase tracking-tighter italic">
              {isFarmer ? '🧑‍🌾 Farmer Login' : specificRole === 'buyer' ? '🛒 Buyer Login' : '🚛 Logistics Login'}
            </span>
            <button
              type="button"
              onClick={() => { setRoleType(null); setSpecificRole(null); setError('') }}
              className="text-xs font-bold text-accent uppercase tracking-widest hover:underline"
            >
              Change
            </button>
          </div>

          <>
            <Button type="button" className="border border-border bg-white text-text-primary hover:bg-surface-2 shadow-sm font-semibold" onClick={handleGoogleLogin} disabled={googleLoading}>
              {googleLoading ? 'Connecting...' : '🔵 Login with Google'}
            </Button>
            <div className="relative my-2 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <span className="relative z-10 bg-surface px-3">{isFarmer ? 'or continue with mobile' : 'or continue with email'}</span>
              <div className="absolute top-1/2 w-full h-px bg-border group-hover:bg-accent/20 transition-all" />
            </div>
          </>

          {isFarmer ? (
            <Input name="mobile" type="tel" placeholder="Your 10-digit mobile number" maxLength={10} required className="text-lg py-4" />
          ) : (
            <Input name="email" type="email" placeholder="Email address" required className="py-4" />
          )}

          <Input name="password" type="password" placeholder="Password" required className="py-4" />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          <Button className="bg-accent-bright text-bg py-4 text-lg font-black shadow-lg shadow-accent/20 active:translate-y-0.5" type="submit">LOGIN</Button>

          <p className="text-center text-xs text-text-muted mt-2">
            Forgot password? <a href="#" className="text-accent underline">Reset it</a>
          </p>
        </form>
      )}
    </main>
  )
}
