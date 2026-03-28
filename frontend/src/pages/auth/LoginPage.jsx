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
      payload.email = String(payload.email || '').trim().toLowerCase()
      const { data } = await login(payload)
      completeAuth(data)
    } catch (err) {
      const details = err?.response?.data
      if (!err?.response) {
        setError('Cannot reach backend API. Start Django server at 127.0.0.1:8000 and try again.')
      } else if (typeof details === 'string') {
        setError(details)
      } else if (details?.detail) {
        setError(details.detail)
      } else if (Array.isArray(details?.non_field_errors) && details.non_field_errors[0]) {
        setError(details.non_field_errors[0])
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
      const tokenEmail = err?.response?.data?.google_email
      if (detail && tokenEmail) {
        setError(`${detail} Google account used: ${tokenEmail}`)
      } else {
        setError(detail || err?.message || 'Google sign-in failed. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-6 font-display text-4xl">Welcome back</h1>
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
        <Button
          type="button"
          className="border border-border bg-white text-text-primary hover:bg-surface-2"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? 'Signing in with Google...' : 'Sign in with Google'}
        </Button>
        <div className="my-1 text-center text-xs text-text-muted">or continue with email</div>

        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button className="bg-accent-bright text-bg" type="submit">Login</Button>
      </form>
    </main>
  )
}
