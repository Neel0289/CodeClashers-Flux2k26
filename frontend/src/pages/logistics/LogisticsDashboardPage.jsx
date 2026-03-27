import { useNavigate } from 'react-router-dom'

import Button from '../../components/shared/Button'
import PageShell from '../../components/shared/PageShell'
import useAuth from '../../hooks/useAuth'

export default function LogisticsDashboardPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <PageShell
      title="Logistics Dashboard"
      actions={<Button onClick={handleLogout}>Logout</Button>}
    />
  )
}
