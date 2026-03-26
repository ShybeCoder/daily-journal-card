/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const data = await apiRequest('/api/auth/me')
        if (active) {
          setUser(data.user)
        }
      } catch {
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setStatus('ready')
        }
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  async function register(payload) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setUser(data.user)
    return data
  }

  async function login(payload) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setUser(data.user)
    return data
  }

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: Boolean(user),
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
