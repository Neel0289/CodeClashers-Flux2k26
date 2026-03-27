import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'

import ProtectedRoute from './components/shared/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import BuyerCatalogPage from './pages/buyer/BuyerCatalogPage'
import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage'
import BuyerNegotiationDetailPage from './pages/buyer/BuyerNegotiationDetailPage'
import BuyerNegotiationsPage from './pages/buyer/BuyerNegotiationsPage'
import BuyerOrderDetailPage from './pages/buyer/BuyerOrderDetailPage'
import BuyerOrdersPage from './pages/buyer/BuyerOrdersPage'
import BuyerProductDetailPage from './pages/buyer/BuyerProductDetailPage'
import FarmerDashboardPage from './pages/farmer/FarmerDashboardPage'
import FarmerListingEditPage from './pages/farmer/FarmerListingEditPage'
import FarmerListingNewPage from './pages/farmer/FarmerListingNewPage'
import FarmerListingsPage from './pages/farmer/FarmerListingsPage'
import FarmerNegotiationDetailPage from './pages/farmer/FarmerNegotiationDetailPage'
import FarmerNegotiationsPage from './pages/farmer/FarmerNegotiationsPage'
import FarmerOrderDetailPage from './pages/farmer/FarmerOrderDetailPage'
import FarmerOrdersPage from './pages/farmer/FarmerOrdersPage'
import LandingPage from './pages/landing/LandingPage'
import LogisticsDashboardPage from './pages/logistics/LogisticsDashboardPage'
import LogisticsDeliveriesPage from './pages/logistics/LogisticsDeliveriesPage'
import LogisticsRequestDetailPage from './pages/logistics/LogisticsRequestDetailPage'
import LogisticsRequestsPage from './pages/logistics/LogisticsRequestsPage'

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboardPage /></ProtectedRoute>} />
          <Route path="/farmer/listings" element={<ProtectedRoute role="farmer"><FarmerListingsPage /></ProtectedRoute>} />
          <Route path="/farmer/listings/new" element={<ProtectedRoute role="farmer"><FarmerListingNewPage /></ProtectedRoute>} />
          <Route path="/farmer/listings/:id/edit" element={<ProtectedRoute role="farmer"><FarmerListingEditPage /></ProtectedRoute>} />
          <Route path="/farmer/negotiations" element={<ProtectedRoute role="farmer"><FarmerNegotiationsPage /></ProtectedRoute>} />
          <Route path="/farmer/negotiations/:id" element={<ProtectedRoute role="farmer"><FarmerNegotiationDetailPage /></ProtectedRoute>} />
          <Route path="/farmer/orders" element={<ProtectedRoute role="farmer"><FarmerOrdersPage /></ProtectedRoute>} />
          <Route path="/farmer/orders/:id" element={<ProtectedRoute role="farmer"><FarmerOrderDetailPage /></ProtectedRoute>} />

          <Route path="/buyer/dashboard" element={<ProtectedRoute role="buyer"><BuyerDashboardPage /></ProtectedRoute>} />
          <Route path="/buyer/catalog" element={<ProtectedRoute role="buyer"><BuyerCatalogPage /></ProtectedRoute>} />
          <Route path="/buyer/products/:id" element={<ProtectedRoute role="buyer"><BuyerProductDetailPage /></ProtectedRoute>} />
          <Route path="/buyer/negotiations" element={<ProtectedRoute role="buyer"><BuyerNegotiationsPage /></ProtectedRoute>} />
          <Route path="/buyer/negotiations/:id" element={<ProtectedRoute role="buyer"><BuyerNegotiationDetailPage /></ProtectedRoute>} />
          <Route path="/buyer/orders" element={<ProtectedRoute role="buyer"><BuyerOrdersPage /></ProtectedRoute>} />
          <Route path="/buyer/orders/:id" element={<ProtectedRoute role="buyer"><BuyerOrderDetailPage /></ProtectedRoute>} />

          <Route path="/logistics/dashboard" element={<ProtectedRoute role="logistics"><LogisticsDashboardPage /></ProtectedRoute>} />
          <Route path="/logistics/requests" element={<ProtectedRoute role="logistics"><LogisticsRequestsPage /></ProtectedRoute>} />
          <Route path="/logistics/requests/:id" element={<ProtectedRoute role="logistics"><LogisticsRequestDetailPage /></ProtectedRoute>} />
          <Route path="/logistics/deliveries" element={<ProtectedRoute role="logistics"><LogisticsDeliveriesPage /></ProtectedRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default App
