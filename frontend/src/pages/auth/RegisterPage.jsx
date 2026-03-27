import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
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

  const fields = useMemo(() => {
    if (role === 'farmer') return ['farm_name', 'farm_state', 'farm_city']
    if (role === 'buyer') return ['business_name', 'business_type', 'state', 'city']
    return ['vehicle_type', 'max_weight_capacity', 'operating_states']
  }, [role])

  const submit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    payload.role = role
    if (payload.operating_states) {
      payload.operating_states = payload.operating_states.split(',').map((s) => s.trim()).filter(Boolean)
    }
    const { data } = await register(payload)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    navigate(`/${role}/dashboard`)
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
            <Button className="md:col-span-3 bg-accent-bright text-bg" onClick={() => setStep(2)}>Continue</Button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
            <Input name="name" placeholder="Full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="phone" placeholder="Phone" required />
            <Input name="password" type="password" placeholder="Password" required />
            {fields.map((field) => <Input key={field} name={field} placeholder={field.replaceAll('_', ' ')} required />)}
            <div className="flex gap-3">
              <Button type="button" className="bg-surface-2" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" className="bg-accent-bright text-bg">Register</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  )
}
