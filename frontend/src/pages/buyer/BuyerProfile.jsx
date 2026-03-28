import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  MapPin,
  Building,
  CreditCard,
  FileCheck,
  Phone,
  Mail,
  Shield,
  ShoppingBag,
  Camera
} from 'lucide-react'
import { updateProfile } from '../../api/auth'
import useAuth from '../../hooks/useAuth'
import PageShell from '../../components/shared/PageShell'

const API_BASE = 'http://localhost:8000'

const LabelValue = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-white/20 shadow-sm">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-text">{value || 'Not provided'}</span>
    </div>
  </div>
)

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="h-5 w-5 text-accent" />
    <h2 className="text-lg font-bold text-accent font-display">{title}</h2>
  </div>
)

export default function BuyerProfilePage() {
  const { user, setUser } = useAuth()
  const profile = user?.profile || {}
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoSuccess, setPhotoSuccess] = useState('')
  const fileInputRef = useRef(null)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  const profileImageUrl = profile.photo
    ? (profile.photo.startsWith('http') ? profile.photo : `${API_BASE}${profile.photo}`)
    : null

  const passbookImageUrl = user?.passbook_photo
    ? (user.passbook_photo.startsWith('http') ? user.passbook_photo : `${API_BASE}${user.passbook_photo}`)
    : null

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file (JPG, PNG, WEBP).')
      setPhotoSuccess('')
      return
    }

    const maxSizeBytes = 5 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setPhotoError('Image is too large. Please upload up to 5 MB.')
      setPhotoSuccess('')
      return
    }

    setUploadingPhoto(true)
    setPhotoError('')
    setPhotoSuccess('')

    try {
      const formData = new FormData()
      formData.append('photo', file)
      const { data } = await updateProfile(formData)
      setUser(data)
      setPhotoSuccess('Profile picture updated successfully.')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setPhotoError(detail || 'Could not update profile picture. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <PageShell title="Your Buyer Profile">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-12"
      >
        {/* Profile Header Card */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-white/60 p-8 shadow-2xl backdrop-blur-md border border-white/40 ring-1 ring-black/5"
        >
          {/* Background Decorative Orbs */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

          <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            {/* Profile Photo */}
            <div className="relative">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-full bg-white p-1.5 shadow-xl ring-1 ring-black/5 overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <div className="h-full w-full bg-accent/5 flex items-center justify-center rounded-full">
                    <User className="h-16 w-16 text-accent/30" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg border-2 border-white disabled:cursor-not-allowed disabled:opacity-60"
                title="Upload profile picture"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoChange}
              />
              <div className="absolute -bottom-2 -left-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg border-2 border-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-black text-accent mb-2 font-display">{user?.first_name || 'Buyer'}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-text-muted">
                <div className="flex items-center gap-1.5 font-medium">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Phone className="h-4 w-4" />
                  {user?.phone}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                <span className="px-4 py-1.5 rounded-full bg-accent/10 text-accent font-bold text-xs border border-accent/20">
                  Verified Buyer
                </span>
                <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 capitalise">
                  {profile.business_type || 'Customer'}
                </span>
              </div>
              {uploadingPhoto ? <p className="mt-3 text-xs font-semibold text-accent">Uploading profile picture...</p> : null}
              {photoError ? <p className="mt-3 text-xs font-semibold text-red-600">{photoError}</p> : null}
              {photoSuccess ? <p className="mt-3 text-xs font-semibold text-green-700">{photoSuccess}</p> : null}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Business Details Section */}
          <motion.div variants={itemVariants} className="space-y-4">
            <SectionHeader icon={Building} title="Business Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelValue icon={Building} label="Business Name" value={profile.business_name} />
              <LabelValue icon={ShoppingBag} label="Business Type" value={profile.business_type} />
              <LabelValue icon={MapPin} label="District" value={profile.district} />
              <LabelValue icon={MapPin} label="City" value={profile.city} />
              <LabelValue icon={MapPin} label="State" value={profile.state} />
              <div className="sm:col-span-2">
                <LabelValue icon={MapPin} label="Full Address" value={profile.address} />
              </div>
              <LabelValue icon={MapPin} label="Latitude" value={profile.latitude} />
              <LabelValue icon={MapPin} label="Longitude" value={profile.longitude} />
            </div>
          </motion.div>

          {/* Identity Section */}
          <motion.div variants={itemVariants} className="space-y-4">
            <SectionHeader icon={Shield} title="Identity Verification" />
            <div className="grid grid-cols-1 gap-4">
              <LabelValue icon={Shield} label="Aadhaar Number" value={user?.aadhaar_number} />
              <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent border border-accent/10">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="text-sm font-bold text-accent">Trust Score</span>
                </div>
                <div className="h-2 w-full bg-black/5 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-accent rounded-full shadow-[0_0_10px_rgba(46,125,50,0.5)]" />
                </div>
                <p className="mt-2 text-xs text-text-muted font-medium italic">High reliable buyer status based on transaction history.</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Banking Details Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <SectionHeader icon={CreditCard} title="Banking Information" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabelValue icon={User} label="Account Holder" value={user?.bank_account_holder} />
              <LabelValue icon={CreditCard} label="Account Number" value={user?.bank_account_number} />
              <LabelValue icon={Building} label="Bank Name" value={user?.bank_name} />
              <LabelValue icon={Building} label="Branch Name" value={user?.bank_branch} />
              <LabelValue icon={Shield} label="IFSC Code" value={user?.bank_ifsc} />
            </div>

            {/* Passbook Preview */}
            <div className="flex flex-col gap-3 rounded-2xl bg-white/40 p-4 border border-white/20 shadow-inner">
              <span className="text-xs font-bold text-accent uppercase tracking-tighter">Passbook/Cheque Preview</span>
              <div className="aspect-[4/3] w-full rounded-xl bg-accent/5 overflow-hidden border border-white shadow-sm">
                {passbookImageUrl ? (
                  <img src={passbookImageUrl} alt="Passbook" className="h-full w-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500" onClick={() => window.open(passbookImageUrl, '_blank')} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-text-muted flex-col gap-2">
                    <FileCheck className="h-8 w-8 text-accent/20" />
                    <span className="text-[10px] font-medium italic">No photo provided</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PageShell>
  )
}
