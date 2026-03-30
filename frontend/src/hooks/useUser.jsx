import { createContext, useContext, useState, useEffect } from 'react'
import { getUser, createUser } from '../services/api'

const UserContext = createContext(null)

const STORAGE_ID_KEY   = 'fittrack_user_id'
const STORAGE_USER_KEY = 'fittrack_user_cache'

// ── helpers ────────────────────────────────────────────────────
const saveToStorage = (user) => {
  localStorage.setItem(STORAGE_ID_KEY,   user.id)
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
}

const clearStorage = () => {
  localStorage.removeItem(STORAGE_ID_KEY)
  localStorage.removeItem(STORAGE_USER_KEY)
}

const loadCachedUser = () => {
  try {
    const cached = localStorage.getItem(STORAGE_USER_KEY)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}
// ──────────────────────────────────────────────────────────────

export function UserProvider({ children }) {
  // Initialise from cache instantly — no flicker, no onboarding flash
  const [user, setUser]       = useState(() => loadCachedUser())
  const [loading, setLoading] = useState(() => !!localStorage.getItem(STORAGE_ID_KEY))

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_ID_KEY)

    if (!savedId) {
      setLoading(false)
      return
    }

    // Silently refresh from API in background
    getUser(savedId)
      .then((res) => {
        const freshUser = res.data
        setUser(freshUser)
        saveToStorage(freshUser)
      })
      .catch((err) => {
        // Do NOT wipe storage on network failure (Render spin-down, hiccup)
        console.warn('[FitTrack] Could not refresh user from API:', err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // Create brand new user (called from Setup step 2)
  const login = async (userData) => {
    const res     = await createUser(userData)
    const newUser = res.data
    saveToStorage(newUser)
    setUser(newUser)
    return newUser
  }

  // Restore an existing user by ID (called from Setup login screen)
  const loginAsExisting = async (userId) => {
    const res      = await getUser(userId)
    const existing = res.data
    saveToStorage(existing)
    setUser(existing)
    return existing
  }

  const logout = () => {
    clearStorage()
    setUser(null)
  }

  const refreshUser = async () => {
    if (!user) return
    try {
      const res = await getUser(user.id)
      setUser(res.data)
      saveToStorage(res.data)
    } catch (err) {
      console.warn('[FitTrack] refreshUser failed:', err.message)
    }
  }

  return (
    <UserContext.Provider value={{ user, loading, login, loginAsExisting, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
