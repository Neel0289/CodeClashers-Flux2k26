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
  Truck,
  Star,
  Award,
  CircleDot
} from 'lucide-react'
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

const VehicleCard = ({ vehicle }) => (
  <div className="p-4 rounded-2xl bg-white/50 backdrop-blur-md border border-white/40 shadow-xl flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
    <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
      <Truck className="h-8 w-8" />
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-text capitalize">{vehicle.vehicle_type}</h4>
        <span className="text-[10px] font-black bg-accent text-white px-2 py-0.5 rounded-full uppercase">{vehicle.vehicle_number}</span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-text-muted flex items-center gap-1 font-medium">
          <Award className="h-3 w-3" /> {vehicle.max_weight_capacity} kg capacity
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {vehicle.operating_states?.map((state, idx) => (
          <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 bg-accent/5 text-accent/70 rounded border border-accent/10">
            {state}
          </span>
        ))}
      </div>
    </div>
  </div>
)

export default function LogisticsProfilePage() {
  const { user } = useAuth()
  const profile = user?.profile || {}

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

  return (
    <PageShell title="Logistics Partner Profile">
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
              <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg border-2 border-white">
                <Truck className="h-5 w-5" />
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-black text-accent mb-2 font-display">{user?.first_name || 'Partner'}</h1>
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
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 font-black text-xs border border-yellow-200 shadow-sm">
                  <Star className="h-3 w-3 fill-yellow-700" />
                  {profile.rating || '5.0'} Rating
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/10 text-accent font-black text-xs border border-accent/20 shadow-sm">
                  <CircleDot className="h-3 w-3 fill-accent" />
                  {profile.total_deliveries || 0} Deliveries
                </div>
                <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 font-black text-xs border border-blue-200 shadow-sm">
                  Gold Partner
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fleet & Logistics Info */}
        <motion.div variants={itemVariants} className="space-y-4">
          <SectionHeader icon={Award} title="Fleet & Operations" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.vehicles?.length > 0 ? (
                  profile.vehicles.map((v, i) => <VehicleCard key={i} vehicle={v} />)
                ) : (
                   <div className="md:col-span-2 p-8 rounded-2xl border-2 border-dashed border-accent/20 bg-accent/5 flex flex-col items-center justify-center text-accent/40 gap-2">
                     <Truck className="h-12 w-12" />
                     <p className="font-bold">No vehicles registered</p>
                   </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
               <div className="p-6 rounded-3xl bg-accent text-white shadow-xl shadow-accent/20 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
                  <h3 className="text-lg font-black mb-4">Verification Info</h3>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Aadhaar Number</span>
                      <span className="font-bold tracking-widest">{user?.aadhaar_number || 'N/A'}</span>
                    </div>
                  </div>
               </div>
               
               <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-xl">
                  <h3 className="text-sm font-black text-accent mb-4 uppercase tracking-wider">Service Highlights</h3>
                  <ul className="space-y-3">
                    {['On-time Delivery', 'Careful Handling', 'Live Tracking', 'Insurance Cover'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-text-muted">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Banking Details Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <SectionHeader icon={CreditCard} title="Banking & Payouts" />
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
