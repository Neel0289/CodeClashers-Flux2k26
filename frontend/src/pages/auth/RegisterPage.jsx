import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'

import { register } from '../../api/auth'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import useAuth from '../../hooks/useAuth'

const roleCards = [
  ['farmer', 'Farmer'],
  ['buyer', 'Buyer'],
  ['logistics', 'Logistics Partner'],
]

const INDIA_CENTER = [22.9734, 78.6569]

function LocationPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('farmer')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [farmCoords, setFarmCoords] = useState({ latitude: '', longitude: '' })

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }

    setLocationLoading(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFarmCoords({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        })
        setLocationLoading(false)
      },
      () => {
        setLocationError('Could not get current location. Please allow location access and try again.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  const handleMapPick = (lat, lon) => {
    setFarmCoords({ latitude: String(lat), longitude: String(lon) })
    setLocationError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    payload.role = role
    if (role === 'farmer') {
      if (!farmCoords.latitude || !farmCoords.longitude) {
        setError('Current location is required for farmer registration. Please fetch location and try again.')
        setSubmitting(false)
        return
      }
      payload.farm_latitude = Number(farmCoords.latitude)
      payload.farm_longitude = Number(farmCoords.longitude)
    }
    if (payload.operating_states) {
      payload.operating_states = payload.operating_states.split(',').map((s) => s.trim()).filter(Boolean)
    }
    try {
      const { data } = await register(payload)
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      setUser(data.user)
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
                <div className="rounded-[12px] border border-border bg-white p-3">
                  <p className="text-sm font-medium text-text-primary">Current Location (Required)</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Latitude: {farmCoords.latitude || '--'} | Longitude: {farmCoords.longitude || '--'}
                  </p>
                  {locationError && <p className="mt-2 text-xs text-red-600">{locationError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={requestCurrentLocation} disabled={locationLoading}>
                      {locationLoading ? 'Fetching Location...' : 'Use Current Location'}
                    </Button>
                    <p className="self-center text-xs text-text-muted">or select by clicking on map below</p>
                  </div>
                  <div className="mt-3 h-64 overflow-hidden rounded-[12px] border border-border">
                    <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      />
                      <LocationPicker onPick={handleMapPick} />
                      {farmCoords.latitude && farmCoords.longitude && (
                        <CircleMarker
                          center={[Number(farmCoords.latitude), Number(farmCoords.longitude)]}
                          radius={8}
                          pathOptions={{ color: '#2E7D32', fillColor: '#2E7D32', fillOpacity: 0.85 }}
                        />
                      )}
                    </MapContainer>
                  </div>
                </div>
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
