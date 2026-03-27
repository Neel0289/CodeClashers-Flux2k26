import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { register } from '../../api/auth'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'

const roleCards = [
  ['farmer', 'Farmer'],
  ['buyer', 'Buyer'],
  ['logistics', 'Logistics Partner'],
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('farmer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    payload.role = role
    if (payload.operating_states) {
      payload.operating_states = payload.operating_states.split(',').map((s) => s.trim()).filter(Boolean)
    }
    try {
      const { data } = await register(payload)
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      navigate(`/${role}/dashboard`)
    } catch (err) {
      const details = err?.response?.data
      if (!err?.response) {
        setError('Cannot reach backend API. Start Django server at 127.0.0.1:8000 and try again.')
      } else if (typeof details === 'string') {
        setError(details)
      } else if (details?.detail) {
        setError(details.detail)
      } else {
        const first = details && typeof details === 'object' ? Object.values(details)[0] : null
        setError(Array.isArray(first) ? first[0] : first || 'Registration failed. Please check your details.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-6 font-display text-4xl">Create your account</h1>
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="roles" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} className="grid gap-4 md:grid-cols-3">
            {roleCards.map(([value, label]) => (
              <button key={value} onClick={() => setRole(value)} className={`rounded-2xl border p-5 ${role === value ? 'border-accent-bright bg-accent/20' : 'border-border bg-surface'}`}>
                {label}
              </button>
            ))}
            <Button className="md:col-span-3" onClick={() => setStep(2)}>Continue</Button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
            <Input name="name" placeholder="Full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="phone" placeholder="Phone" required />
            <Input name="password" type="password" placeholder="Password" required />
            {role === 'farmer' && (
              <>
                <Input name="farm_name" placeholder="Farm name" required />
                <Input name="farm_state" placeholder="Farm state" required />
                <Input name="farm_city" placeholder="Farm city" required />
              </>
            )}
            {role === 'buyer' && (
              <>
                <Input name="business_name" placeholder="Business name" required />
                <select name="business_type" className="focus-ring w-full rounded-[12px] border border-border bg-white px-4 py-2 text-text-primary shadow-sm" required>
                  <option value="">Select business type</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="store">Store</option>
                </select>
                <Input name="state" placeholder="State" required />
                <Input name="city" placeholder="City" required />
              </>
            )}
            {role === 'logistics' && (
              <>
                <select name="vehicle_type" className="focus-ring w-full rounded-[12px] border border-border bg-white px-4 py-2 text-text-primary shadow-sm" required>
                  <option value="">Select vehicle type</option>
                  <option value="bike">Bike</option>
                  <option value="tempo">Tempo</option>
                  <option value="truck">Truck</option>
                </select>
                <Input name="max_weight_capacity" type="number" min="1" step="1" placeholder="Max weight capacity (kg)" required />
                <Input name="operating_states" placeholder="Operating states (comma separated)" required />
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button type="button" className="bg-surface-2 text-text-primary hover:bg-surface-2" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" disabled={submitting} className={submitting ? 'opacity-70' : ''}>{submitting ? 'Registering...' : 'Register'}</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  )
}
