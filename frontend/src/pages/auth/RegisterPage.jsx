import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'

import { register } from '../../api/auth'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import useAuth from '../../hooks/useAuth'

const roleCards = [
  ['farmer', '🌾 Farmer'],
  ['buyer', '🛒 Buyer'],
  ['logistics', '🚛 Logistics Partner'],
]

const INDIA_CENTER = [22.9734, 78.6569]

const CERTIFICATE_OPTIONS = [
  { value: '7/12', label: '7/12 Utara' },
  { value: 'pm_kisan', label: 'PM-KISAN' },
  { value: 'land_paper', label: 'Land Paper' },
  { value: 'agristack', label: 'AgriStack' },
  { value: 'farmer_registry', label: 'Farmer Registry' },
]

const INDIAN_VEHICLE_NUMBER_REGEX = /^(?:[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}|\d{2}\s?BH\s?\d{4}\s?[A-Z]{1,2})$/
const INDIAN_BANK_ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/
const INDIAN_IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

const createEmptyLogisticsVehicle = () => ({
  vehicle_type: 'truck',
  operating_area: '',
  max_capacity: '',
  vehicle_number: '',
})

function LocationPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function PhotoUpload({ label, name, preview, onChange }) {
  const inputRef = useRef(null)
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-text-primary">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface hover:border-accent/50 hover:bg-accent/5 transition-all"
      >
        {preview ? (
          <img src={preview} alt="preview" className="h-full w-full rounded-xl object-cover" />
        ) : (
          <>
            <span className="text-2xl">📷</span>
            <span className="mt-1 text-xs text-text-muted">Click to upload</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" name={name} accept="image/*" className="hidden" onChange={onChange} />
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-bold uppercase tracking-widest text-text-muted">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

const inputCls = 'w-full rounded-[12px] border border-border bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

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
  const [buyerCoords, setBuyerCoords] = useState({ latitude: '', longitude: '' })

  // Buyer-specific state
  const [buyerPhoto, setBuyerPhoto] = useState(null)
  const [buyerPhotoPreview, setBuyerPhotoPreview] = useState('')
  const [farmerPhoto, setFarmerPhoto] = useState(null)
  const [farmerPhotoPreview, setFarmerPhotoPreview] = useState('')
  const [passbookPhoto, setPassbookPhoto] = useState(null)
  const [passbookPhotoPreview, setPassbookPhotoPreview] = useState('')
  const [selectedCertificates, setSelectedCertificates] = useState([])
  const [logisticsVehicles, setLogisticsVehicles] = useState([createEmptyLogisticsVehicle()])
  const [isScanning, setIsScanning] = useState(false)
  const [bankDetails, setBankDetails] = useState({
    holder: '',
    number: '',
    ifsc: '',
    bankName: '',
    branch: '',
  })

  const handlePhotoChange = (e, setter, previewSetter) => {
    const file = e.target.files?.[0]
    if (file) {
      setter(file)
      previewSetter(URL.createObjectURL(file))
      
      // If uploading a passbook, trigger simulated OCR
      if (setter === setPassbookPhoto) {
        handlePassbookOCR()
      }
    }
  }

  const handlePassbookOCR = () => {
    setIsScanning(true)
    // Simulate API delay
    setTimeout(() => {
      setBankDetails({
        holder: 'RAMESHBHAI VINUBHAI SAVAJ',
        number: '917579102030', // Mocking based on visible digits
        ifsc: 'BKID0002715', // Bank of India, Surat branch example
        bankName: 'Bank of India',
        branch: 'SIMADA GAM, SURAT',
      })
      setIsScanning(false)
    }, 2000)
  }

  const updateBankField = (field, val) => {
    let nextValue = val
    if (field === 'number') {
      nextValue = String(val || '').replace(/\D/g, '').slice(0, 18)
    }
    if (field === 'ifsc') {
      nextValue = String(val || '').toUpperCase().replace(/\s/g, '').slice(0, 11)
    }
    setBankDetails(prev => ({ ...prev, [field]: nextValue }))
  }

  const toggleCertificate = (val) => {
    setSelectedCertificates((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    )
  }

  const updateLogisticsVehicle = (index, field, value) => {
    setLogisticsVehicles((prev) => prev.map((vehicle, i) => {
      if (i !== index) return vehicle
      const nextValue = field === 'vehicle_number' ? String(value).toUpperCase() : value
      return { ...vehicle, [field]: nextValue }
    }))
  }

  const addLogisticsVehicle = () => {
    setLogisticsVehicles((prev) => [...prev, createEmptyLogisticsVehicle()])
  }

  const removeLogisticsVehicle = (index) => {
    setLogisticsVehicles((prev) => prev.filter((_, i) => i !== index))
  }

  const requestCurrentLocation = (target) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.')
      return
    }
    setLocationLoading(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }
        if (target === 'buyer') setBuyerCoords(coords)
        else setFarmCoords(coords)
        setLocationLoading(false)
      },
      () => {
        setLocationError('Could not get location. Please allow access and try again.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  const handleMapPick = (target, lat, lon) => {
    if (target === 'buyer') setBuyerCoords({ latitude: String(lat), longitude: String(lon) })
    else setFarmCoords({ latitude: String(lat), longitude: String(lon) })
    setLocationError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const formEl = event.currentTarget
    const formData = new FormData(formEl)

    const normalizedBankAccountNumber = String(bankDetails.number || '').replace(/\D/g, '')
    const normalizedIfsc = String(bankDetails.ifsc || '').toUpperCase().replace(/\s/g, '')

    if (!INDIAN_BANK_ACCOUNT_NUMBER_REGEX.test(normalizedBankAccountNumber)) {
      setError('Please enter a valid Indian bank account number (9 to 18 digits).')
      setSubmitting(false)
      return
    }

    if (normalizedIfsc.length !== 11) {
      setError('IFSC code must be exactly 11 characters.')
      setSubmitting(false)
      return
    }

    if (!/^[A-Z]{4}/.test(normalizedIfsc)) {
      setError('IFSC code must start with 4 alphabetic characters (e.g., SBIN).')
      setSubmitting(false)
      return
    }

    if (normalizedIfsc[4] !== '0') {
      setError('The 5th character in IFSC code must be 0.')
      setSubmitting(false)
      return
    }

    if (!INDIAN_IFSC_REGEX.test(normalizedIfsc)) {
      setError('Please enter a valid IFSC code (format: ABCD0XXXXXX).')
      setSubmitting(false)
      return
    }

    formData.set('bank_account_number', normalizedBankAccountNumber)
    formData.set('bank_ifsc', normalizedIfsc)

    // For farmer: validate shared login fields and map farm coordinates
    if (role === 'farmer') {
      const phone = String(formData.get('phone') || '').trim()
      const email = String(formData.get('email') || '').trim()

      if (!email) {
        setError('Please enter a valid email address.')
        setSubmitting(false)
        return
      }

      if (!phone || phone.length < 10) {
        setError('Please enter a valid 10-digit mobile number.')
        setSubmitting(false)
        return
      }
      formData.set('phone', phone)

      // Attach coordinates
      if (!farmCoords.latitude || !farmCoords.longitude) {
        setError('Location is required. Please fetch GPS or click map.')
        setSubmitting(false)
        return
      }
      formData.set('farm_latitude', farmCoords.latitude)
      formData.set('farm_longitude', farmCoords.longitude)

      // Attach certificates
      formData.set('certificates', JSON.stringify(selectedCertificates))

      // Attach bank details from state directly as it's controlled
      formData.set('bank_account_holder', bankDetails.holder)
      formData.set('bank_account_number', normalizedBankAccountNumber)
      formData.set('bank_ifsc', normalizedIfsc)
      formData.set('bank_name', bankDetails.bankName)
      formData.set('bank_branch', bankDetails.branch)

      // Attach photo files
      if (farmerPhoto) formData.set('farmer_photo_file', farmerPhoto)
      if (passbookPhoto) formData.set('passbook_photo_file', passbookPhoto)
    }

    if (role === 'buyer') {
      if (!buyerCoords.latitude || !buyerCoords.longitude) {
        setError('Location is required for buyer registration.')
        setSubmitting(false)
        return
      }
      const selectedBusinessType = String(formData.get('business_type') || formData.get('buyer_type') || '').trim().toLowerCase()
      if (!selectedBusinessType) {
        setError('Please select a business type.')
        setSubmitting(false)
        return
      }
      formData.set('business_type', selectedBusinessType)

      formData.set('buyer_latitude', buyerCoords.latitude)
      formData.set('buyer_longitude', buyerCoords.longitude)

      // Attach bank details
      formData.set('bank_account_holder', bankDetails.holder)
      formData.set('bank_account_number', normalizedBankAccountNumber)
      formData.set('bank_ifsc', normalizedIfsc)
      formData.set('bank_name', bankDetails.bankName)
      formData.set('bank_branch', bankDetails.branch)

      // Attach buyer photo
      if (buyerPhoto) formData.set('buyer_photo_file', buyerPhoto)
      if (passbookPhoto) formData.set('passbook_photo_file', passbookPhoto)
    }

    if (role === 'logistics') {
      const cleanedVehicles = logisticsVehicles.map((vehicle) => ({
        vehicle_type: String(vehicle.vehicle_type || '').trim().toLowerCase(),
        operating_area: String(vehicle.operating_area || '').trim(),
        max_capacity: Number(vehicle.max_capacity),
        vehicle_number: String(vehicle.vehicle_number || '').trim().toUpperCase(),
      }))

      if (!cleanedVehicles.length) {
        setError('Please add at least one vehicle.')
        setSubmitting(false)
        return
      }

      for (let i = 0; i < cleanedVehicles.length; i += 1) {
        const vehicle = cleanedVehicles[i]
        if (!vehicle.vehicle_type || !vehicle.operating_area || !vehicle.vehicle_number || !vehicle.max_capacity || vehicle.max_capacity <= 0) {
          setError(`Please complete all fields for Vehicle ${i + 1}.`)
          setSubmitting(false)
          return
        }

        if (!INDIAN_VEHICLE_NUMBER_REGEX.test(vehicle.vehicle_number)) {
          setError(`Vehicle ${i + 1} number is invalid. Use Indian format like MH12AB1234.`)
          setSubmitting(false)
          return
        }
      }

      const allOperatingStates = [...new Set(
        cleanedVehicles.flatMap((vehicle) => vehicle.operating_area.split(',').map((s) => s.trim()).filter(Boolean))
      )]

      const payloadVehicles = cleanedVehicles.map((vehicle) => ({
        vehicle_type: vehicle.vehicle_type,
        vehicle_number: vehicle.vehicle_number,
        max_weight_capacity: vehicle.max_capacity,
        operating_states: vehicle.operating_area.split(',').map((s) => s.trim()).filter(Boolean),
      }))

      formData.set('vehicles', JSON.stringify(payloadVehicles))
      formData.set('vehicle_type', payloadVehicles[0].vehicle_type)
      formData.set('max_weight_capacity', String(payloadVehicles[0].max_weight_capacity))
      formData.set('operating_states', JSON.stringify(allOperatingStates))

      // Attach bank details
      formData.set('bank_account_holder', bankDetails.holder)
      formData.set('bank_account_number', normalizedBankAccountNumber)
      formData.set('bank_ifsc', normalizedIfsc)
      formData.set('bank_name', bankDetails.bankName)
      formData.set('bank_branch', bankDetails.branch)
      // Attach passbook if shared
      if (passbookPhoto) formData.set('passbook_photo_file', passbookPhoto)
    }

    formData.set('role', role)

    try {
      const { data } = await register(formData)
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      setUser(data.user)
      navigate(`/${role}/dashboard`)
    } catch (err) {
      const details = err?.response?.data
      if (!err?.response) {
        setError('Cannot reach backend. Start Django server at 127.0.0.1:8000.')
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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 font-display text-4xl text-text-primary">Create your account</h1>
      <p className="mb-6 text-sm text-text-muted">Join KhetBazar and start trading directly.</p>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="roles" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {roleCards.map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setRole(value)}
                  className={`rounded-2xl border p-5 text-center font-semibold transition-all ${
                    role === value ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-primary hover:border-accent/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>Continue →</Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            onSubmit={submit}
            encType="multipart/form-data"
            className="space-y-4 rounded-2xl border border-border bg-surface p-6"
          >
            {/* ── Common fields ──────────────────────────────────────────── */}
            {/* ── Basic Information ──────────────────────────────────── */}
            <SectionHeading>Account Security</SectionHeading>
            <Input name="email" type="email" placeholder="Email address" required />
            <Input name="phone" type="tel" placeholder="Phone number" maxLength={10} required />
            <Input name="password" type="password" placeholder="Create password" required />

            {/* ── FARMER fields ─────────────────────────────────────────── */}
            {role === 'farmer' && (
              <>
                <SectionHeading>Basic Information</SectionHeading>
                <Input name="name" placeholder="Full name" required />
                {/* Farmer photo */}
                <SectionHeading>Profile & Photo</SectionHeading>
                <PhotoUpload
                  label="Farmer's Photo *"
                  name="farmer_photo_file"
                  preview={farmerPhotoPreview}
                  onChange={(e) => handlePhotoChange(e, setFarmerPhoto, setFarmerPhotoPreview)}
                />

                {/* Address */}
                <SectionHeading>Address Details</SectionHeading>
                <Input name="address" placeholder="Full address (House no., Street)" required />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="village" placeholder="Village" required />
                  <Input name="taluka" placeholder="Taluka / Tehsil" required />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="farm_city" placeholder="District / City" required />
                  <Input name="farm_state" placeholder="State" required />
                </div>
                <Input name="farm_name" placeholder="Farm name" />

                {/* Identity */}
                <SectionHeading>Identity Verification</SectionHeading>
                <Input name="aadhaar_number" placeholder="Aadhaar Number (12 digits)" maxLength={12} required />

                {/* Certificates — optional */}
                <div>
                  <p className="mb-2 text-sm font-medium text-text-primary">
                    Certificates <span className="text-xs font-normal text-text-muted">(optional – select all that apply)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleCertificate(opt.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          selectedCertificates.includes(opt.value)
                            ? 'border-accent bg-accent text-white'
                            : 'border-border bg-white text-text-primary hover:border-accent/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bank account details */}
                <SectionHeading>Bank Account Details</SectionHeading>
                {isScanning && (
                  <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-center animate-pulse mb-2">
                    <span className="text-accent font-bold text-xs uppercase tracking-widest">🔍 Scanning Passbook... Please wait...</span>
                  </div>
                )}
                <Input name="bank_account_holder" placeholder="Account holder name" value={bankDetails.holder} onChange={(e) => updateBankField('holder', e.target.value)} required />
                <Input name="bank_account_number" placeholder="Bank account number" value={bankDetails.number} onChange={(e) => updateBankField('number', e.target.value)} minLength={9} maxLength={18} pattern="\d{9,18}" title="Enter 9 to 18 digits" required />
                <Input name="bank_ifsc" placeholder="IFSC code" value={bankDetails.ifsc} onChange={(e) => updateBankField('ifsc', e.target.value)} minLength={11} maxLength={11} pattern="[A-Z]{4}0[A-Z0-9]{6}" title="Format: 4 letters, 0, then 6 alphanumeric characters" required />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="bank_name" placeholder="Bank name" value={bankDetails.bankName} onChange={(e) => updateBankField('bankName', e.target.value)} required />
                  <Input name="bank_branch" placeholder="Branch name" value={bankDetails.branch} onChange={(e) => updateBankField('branch', e.target.value)} required />
                </div>

                {/* Passbook photo */}
                <PhotoUpload
                  label="Passbook / Cheque Photo *"
                  name="passbook_photo_file"
                  preview={passbookPhotoPreview}
                  onChange={(e) => handlePhotoChange(e, setPassbookPhoto, setPassbookPhotoPreview)}
                />

                {/* Location */}
                <SectionHeading>Farm Location</SectionHeading>
                <div className="rounded-[12px] border border-border bg-white p-3">
                  <p className="text-sm font-medium text-text-primary">GPS Location (Required)</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Lat: {farmCoords.latitude || '--'} | Lon: {farmCoords.longitude || '--'}
                  </p>
                  {locationError && <p className="mt-2 text-xs text-red-600">{locationError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => requestCurrentLocation('farmer')} disabled={locationLoading}>
                      {locationLoading ? 'Fetching...' : '📍 Use Current Location'}
                    </Button>
                    <p className="self-center text-xs text-text-muted">or click on map below</p>
                  </div>
                  <div className="mt-3 h-48 overflow-hidden rounded-[12px] border border-border">
                    <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
                      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPicker onPick={(lat, lon) => handleMapPick('farmer', lat, lon)} />
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

            {/* ── BUYER fields ──────────────────────────────────────────── */}
            {role === 'buyer' && (
              <>
                <SectionHeading>Personal Details</SectionHeading>
                <Input name="name" placeholder="Full name" required />
                <Input name="business_name" placeholder="Business name" required />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="aadhaar_number" placeholder="Aadhaar Number (12 digits)" maxLength={12} required />
                  <Input name="district" placeholder="District" required />
                </div>
                <Input name="address" placeholder="Full Address" required />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input name="city" placeholder="City" required />
                  <Input name="state" placeholder="State" required />
                </div>
                <PhotoUpload
                  label="Profile Photo *"
                  name="buyer_photo_file"
                  preview={buyerPhotoPreview}
                  onChange={(e) => handlePhotoChange(e, setBuyerPhoto, setBuyerPhotoPreview)}
                />

                <SectionHeading>Professional Details</SectionHeading>
                <select name="business_type" className={inputCls} required>
                  <option value="">Select Professional Type</option>
                  <option value="store">Store</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="buyer">Buyer</option>
                </select>

                <SectionHeading>Bank Details</SectionHeading>
                {isScanning && (
                  <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-center animate-pulse mb-2">
                    <span className="text-accent font-bold text-xs uppercase tracking-widest">🔍 Scanning Passbook... Please wait...</span>
                  </div>
                )}
                <Input name="bank_account_holder" placeholder="Account holder name" value={bankDetails.holder} onChange={(e) => updateBankField('holder', e.target.value)} required />
                <Input name="bank_account_number" placeholder="Bank account number" value={bankDetails.number} onChange={(e) => updateBankField('number', e.target.value)} minLength={9} maxLength={18} pattern="\d{9,18}" title="Enter 9 to 18 digits" required />
                <Input name="bank_ifsc" placeholder="IFSC code" value={bankDetails.ifsc} onChange={(e) => updateBankField('ifsc', e.target.value)} minLength={11} maxLength={11} pattern="[A-Z]{4}0[A-Z0-9]{6}" title="Format: 4 letters, 0, then 6 alphanumeric characters" required />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="bank_name" placeholder="Bank Name" value={bankDetails.bankName} onChange={(e) => updateBankField('bankName', e.target.value)} required />
                  <Input name="bank_branch" placeholder="Branch Name" value={bankDetails.branch} onChange={(e) => updateBankField('branch', e.target.value)} required />
                </div>
                {/* Photo upload for buyer passbook - also triggers OCR */}
                <PhotoUpload
                  label="Passbook / Cheque Photo (Optional for Auto-fill)"
                  name="passbook_photo_file"
                  preview={passbookPhotoPreview}
                  onChange={(e) => handlePhotoChange(e, setPassbookPhoto, setPassbookPhotoPreview)}
                />

                <SectionHeading>Business Location</SectionHeading>
                <div className="rounded-[12px] border border-border bg-white p-3">
                  <p className="text-sm font-medium text-text-primary">GPS Location (Required)</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Lat: {buyerCoords.latitude || '--'} | Lon: {buyerCoords.longitude || '--'}
                  </p>
                  {locationError && <p className="mt-2 text-xs text-red-600">{locationError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => requestCurrentLocation('buyer')} disabled={locationLoading}>
                      {locationLoading ? 'Fetching...' : '📍 Use Current Location'}
                    </Button>
                    <p className="self-center text-xs text-text-muted">or click on map below</p>
                  </div>
                  <div className="mt-3 h-48 overflow-hidden rounded-[12px] border border-border">
                    <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
                      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPicker onPick={(lat, lon) => handleMapPick('buyer', lat, lon)} />
                      {buyerCoords.latitude && buyerCoords.longitude && (
                        <CircleMarker
                          center={[Number(buyerCoords.latitude), Number(buyerCoords.longitude)]}
                          radius={8}
                          pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 0.85 }}
                        />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </>
            )}

            {/* ── LOGISTICS fields ──────────────────────────────────────── */}
            {role === 'logistics' && (
              <>
                <SectionHeading>Basic Information</SectionHeading>
                <Input name="name" placeholder="Full name" required />

                <SectionHeading>Vehicle Details</SectionHeading>
                <div className="space-y-3">
                  {logisticsVehicles.map((vehicle, index) => (
                    <div key={`vehicle-${index}`} className="rounded-xl border border-border bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-text-primary">Vehicle {index + 1}</p>
                        {logisticsVehicles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLogisticsVehicle(index)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          value={vehicle.vehicle_type}
                          onChange={(e) => updateLogisticsVehicle(index, 'vehicle_type', e.target.value)}
                          className={inputCls}
                          required
                        >
                          <option value="bike">Bike</option>
                          <option value="tempo">Tempo</option>
                          <option value="truck">Truck</option>
                        </select>
                        <Input
                          placeholder="Vehicle number (e.g., MH12AB1234)"
                          value={vehicle.vehicle_number}
                          onChange={(e) => updateLogisticsVehicle(index, 'vehicle_number', e.target.value)}
                          required
                        />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Input
                          placeholder="Where it operates (comma separated states)"
                          value={vehicle.operating_area}
                          onChange={(e) => updateLogisticsVehicle(index, 'operating_area', e.target.value)}
                          required
                        />
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Max capacity (kg)"
                          value={vehicle.max_capacity}
                          onChange={(e) => updateLogisticsVehicle(index, 'max_capacity', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" className="w-full" onClick={addLogisticsVehicle}>
                  + Add another vehicle
                </Button>

                <SectionHeading>Bank Details</SectionHeading>
                {isScanning && (
                  <div className="rounded-xl bg-accent/5 border border-accent/20 p-4 text-center animate-pulse mb-2">
                    <span className="text-accent font-bold text-xs uppercase tracking-widest">🔍 Scanning Passbook... Please wait...</span>
                  </div>
                )}
                <Input name="bank_account_holder" placeholder="Account holder name" value={bankDetails.holder} onChange={(e) => updateBankField('holder', e.target.value)} required />
                <Input name="bank_account_number" placeholder="Bank account number" value={bankDetails.number} onChange={(e) => updateBankField('number', e.target.value)} minLength={9} maxLength={18} pattern="\d{9,18}" title="Enter 9 to 18 digits" required />
                <Input name="bank_ifsc" placeholder="IFSC code" value={bankDetails.ifsc} onChange={(e) => updateBankField('ifsc', e.target.value)} minLength={11} maxLength={11} pattern="[A-Z]{4}0[A-Z0-9]{6}" title="Format: 4 letters, 0, then 6 alphanumeric characters" required />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input name="bank_name" placeholder="Bank Name" value={bankDetails.bankName} onChange={(e) => updateBankField('bankName', e.target.value)} required />
                  <Input name="bank_branch" placeholder="Branch Name" value={bankDetails.branch} onChange={(e) => updateBankField('branch', e.target.value)} required />
                </div>
                <PhotoUpload
                  label="Passbook / Cheque Photo (For Auto-fill)"
                  name="passbook_photo_file"
                  preview={passbookPhotoPreview}
                  onChange={(e) => handlePhotoChange(e, setPassbookPhoto, setPassbookPhotoPreview)}
                />
              </>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" className="bg-surface-2 text-text-primary hover:bg-surface-2" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button type="submit" disabled={submitting} className={`flex-1 ${submitting ? 'opacity-70' : ''}`}>
                {submitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>

            <p className="text-center text-xs text-text-muted">
              Already have an account?{' '}
              <a href="/login" className="text-accent underline">Login here</a>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </main>
  )
}
