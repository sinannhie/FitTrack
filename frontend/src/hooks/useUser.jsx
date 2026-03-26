import { createContext, useContext, useState, useEffect } from 'react'
import { getUser, createUser } from '../services/api'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Persist user ID in localStorage
  useEffect(() => {
    const savedId = localStorage.getItem('fittrack_user_id')
    if (savedId) {
      getUser(savedId)
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('fittrack_user_id'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (userData) => {
    const res = await createUser(userData)
    const newUser = res.data
    localStorage.setItem('fittrack_user_id', newUser.id)
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    localStorage.removeItem('fittrack_user_id')
    setUser(null)
  }

  const refreshUser = async () => {
    if (!user) return
    const res = await getUser(user.id)
    setUser(res.data)
  }

  return (
    <UserContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
