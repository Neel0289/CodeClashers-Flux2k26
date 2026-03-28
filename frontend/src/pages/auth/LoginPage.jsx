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
    <main className="min-h-screen farm-bg px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-4xl items-center justify-center">
        <div className="w-full max-w-2xl rounded-[36px] border border-white/70 bg-white/60 p-6 shadow-[0_32px_80px_-28px_rgba(15,23,42,0.6)] backdrop-blur-2xl sm:p-8">
          <h1 className="mb-2 text-center font-display text-5xl text-text-primary">Login</h1>
          <p className="mb-8 text-center text-lg font-medium italic text-text-muted">Connecting Bharat's Farmers directly to the Market.</p>

      {/* ── Step 1: Are you a farmer? ─────────────────────────── */}
      {!roleType ? (
        <div className="grid gap-5 rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_20px_50px_-30px_rgba(30,41,59,0.7)] backdrop-blur-xl sm:p-7">
          <p className="mb-1 text-center text-3xl font-black text-text-primary">Welcome! Who are you?</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setRoleType('farmer')}
              className="group clay-card flex min-h-[148px] flex-col items-start justify-between rounded-[24px] border-2 border-accent/25 bg-white/95 p-5 text-left transition-all hover:-translate-y-1 hover:border-accent"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">🌾</span>
                <p className="text-xl font-black uppercase tracking-tight text-text-primary">Farmer</p>
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-text-muted">Login with your mobile number</p>
                <span className="mt-3 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent transition-transform group-hover:translate-x-1">Continue →</span>
              </div>
            </button>

            <button
              onClick={() => setRoleType('other')}
              className="group clay-card flex min-h-[148px] flex-col items-start justify-between rounded-[24px] border-2 border-border bg-white/95 p-5 text-left transition-all hover:-translate-y-1 hover:border-accent/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">🤝</span>
                <p className="text-xl font-black uppercase tracking-tight text-text-primary">Buyer/Partner</p>
              </div>
              <div className="w-full">
                <p className="text-sm font-medium text-text-muted">Login with email or Google</p>
                <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-text-muted transition-transform group-hover:translate-x-1">Continue →</span>
              </div>
            </button>
          </div>
          <p className="mt-2 text-center text-sm text-text-muted">
            New here? <a href="/register" className="text-accent font-semibold underline">Register here</a>
          </p>
        </div>
      ) : roleType === 'other' && !specificRole ? (
        /* ── Step 1b: If not farmer, choose specific role ───── */
        <div className="grid gap-4 rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_20px_50px_-30px_rgba(30,41,59,0.7)] backdrop-blur-xl">
          <button onClick={() => setRoleType(null)} className="mb-1 text-left text-xs font-bold uppercase tracking-widest text-accent underline">← Back</button>
          <p className="mb-1 text-center text-2xl font-black text-text-primary">Are you a...</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setSpecificRole('buyer')} className="clay-card rounded-[22px] border border-white/80 bg-white/90 p-6 text-center hover:border-accent transition-all hover:-translate-y-1">
              <span className="mb-2 block text-4xl">🛒</span>
              <p className="text-base font-black">Buyer</p>
            </button>
            <button onClick={() => setSpecificRole('logistics')} className="clay-card rounded-[22px] border border-white/80 bg-white/90 p-6 text-center hover:border-accent transition-all hover:-translate-y-1">
              <span className="mb-2 block text-4xl">🚛</span>
              <p className="text-base font-black">Logistics</p>
            </button>
          </div>
        </div>
      ) : (
        /* ── Step 2: Login form ─────────────────────────────── */
        <form onSubmit={submit} className="grid gap-4 rounded-[30px] border border-white/80 bg-white/75 p-7 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.75)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
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
            <Button type="button" variant="clay" className="border border-white/80 bg-white/90 text-text-primary hover:bg-white shadow-sm font-semibold" onClick={handleGoogleLogin} disabled={googleLoading}>
              {googleLoading ? 'Connecting...' : '🔵 Login with Google'}
            </Button>
            <div className="relative my-2 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <span className="relative z-10 bg-white/80 px-3">{isFarmer ? 'or continue with mobile' : 'or continue with email'}</span>
              <div className="absolute top-1/2 w-full h-px bg-border group-hover:bg-accent/20 transition-all" />
            </div>
          </>

          {isFarmer ? (
            <Input variant="clay" name="mobile" type="tel" placeholder="Your 10-digit mobile number" maxLength={10} required className="text-lg py-4 bg-white/90" />
          ) : (
            <Input variant="clay" name="email" type="email" placeholder="Email address" required className="py-4 bg-white/90" />
          )}

          <Input variant="clay" name="password" type="password" placeholder="Password" required className="py-4 bg-white/90" />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          <Button variant="clay" className="bg-accent-bright text-bg py-4 text-lg font-black shadow-lg shadow-accent/20 active:translate-y-0.5" type="submit">LOGIN</Button>

          <p className="text-center text-xs text-text-muted mt-2">
            Forgot password? <a href="#" className="text-accent underline">Reset it</a>
          </p>
        </form>
      )}
        </div>
      </div>
    </main>
  )
}
