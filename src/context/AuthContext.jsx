/* eslint-disable react-refresh/only-export-components */
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { apiRequest } from '../lib/api.js'

const AuthContext = createContext(null)

function getPasskeyErrorMessage(actionError, fallbackMessage) {
  if (actionError?.name === 'NotAllowedError') {
    return fallbackMessage
  }

  if (actionError?.name === 'InvalidStateError') {
    return 'That passkey is already saved on this account.'
  }

  return actionError?.message || 'Something went wrong.'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  const refreshSession = useCallback(async () => {
    const data = await apiRequest('/api/auth/me')
    setUser(data.user)
    return data
  }, [])

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

  const register = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setUser(data.user)
    return data
  }, [])

  const login = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setUser(data.user)
    return data
  }, [])

  const changePassword = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (data.user) {
      setUser(data.user)
    }
    return data
  }, [])

  const updateRecoveryQuestion = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/recovery/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (data.user) {
      setUser(data.user)
    }
    return data
  }, [])

  const startPasswordRecovery = useCallback(async (payload) => {
    return apiRequest('/api/auth/recovery/question', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }, [])

  const completePasswordRecovery = useCallback(async (payload) => {
    const data = await apiRequest('/api/auth/recovery/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setUser(data.user)
    return data
  }, [])

  function ensurePasskeysSupported() {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      throw new Error('This browser does not support passkeys yet.')
    }
  }

  const registerPasskey = useCallback(async () => {
    ensurePasskeysSupported()

    try {
      const options = await apiRequest('/api/auth/passkeys/register/options', {
        method: 'POST',
      })
      const response = await startRegistration({ optionsJSON: options.options })
      const data = await apiRequest('/api/auth/passkeys/register/verify', {
        method: 'POST',
        body: JSON.stringify({ response }),
      })

      if (data.user) {
        setUser(data.user)
      }

      return data
    } catch (actionError) {
      throw new Error(
        getPasskeyErrorMessage(actionError, 'Passkey setup was canceled.'),
      )
    }
  }, [])

  const loginWithPasskey = useCallback(async () => {
    ensurePasskeysSupported()

    try {
      const options = await apiRequest('/api/auth/passkeys/login/options', {
        method: 'POST',
      })
      const response = await startAuthentication({ optionsJSON: options.options })
      const data = await apiRequest('/api/auth/passkeys/login/verify', {
        method: 'POST',
        body: JSON.stringify({ response }),
      })
      setUser(data.user)
      return data
    } catch (actionError) {
      throw new Error(
        getPasskeyErrorMessage(actionError, 'Passkey sign-in was canceled.'),
      )
    }
  }, [])

  const listPasskeys = useCallback(async () => {
    return apiRequest('/api/auth/passkeys')
  }, [])

  const logout = useCallback(async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isAuthenticated: Boolean(user),
        changePassword,
        completePasswordRecovery,
        listPasskeys,
        login,
        loginWithPasskey,
        logout,
        refreshSession,
        register,
        registerPasskey,
        startPasswordRecovery,
        updateRecoveryQuestion,
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
