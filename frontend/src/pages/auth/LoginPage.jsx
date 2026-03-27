import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { login } from '../../api/auth'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import useAuth from '../../hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const formData = new FormData(event.currentTarget)
      const payload = Object.fromEntries(formData.entries())
      payload.email = String(payload.email || '').trim().toLowerCase()
      const { data } = await login(payload)
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      setUser(data.user)
      navigate(`/${data.user.role}/dashboard`)
    } catch {
      setError('Invalid credentials')
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-6 font-display text-4xl">Welcome back</h1>
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
        <Input name="email" type="email" placeholder="Email" required />
        <Input name="password" type="password" placeholder="Password" required />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <Button className="bg-accent-bright text-bg" type="submit">Login</Button>
      </form>
    </main>
  )
}
