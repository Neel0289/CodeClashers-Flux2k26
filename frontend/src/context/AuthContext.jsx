import { createContext, useEffect, useMemo, useState } from 'react'

import { getProfile } from '../api/auth'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    if (!localStorage.getItem('access')) {
      setLoading(false)
      return
    }
    try {
      const { data } = await getProfile()
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      logout: () => {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        setUser(null)
      },
      refreshProfile: loadProfile,
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
