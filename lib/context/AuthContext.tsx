'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser, RoleName, Session } from '@/lib/types'
import { login as loginRequest, logout as logoutRequest } from '@/lib/api/authService'

interface AuthContextType {
  session: Session
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasRole: (roles: RoleName[]) => boolean
  isAgent: boolean
  isAdmin: boolean
}

const STORAGE_TOKEN_KEY = 'token'
const STORAGE_USER_KEY = 'auth_user'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function setCookie(name: string, value: string, maxAgeSeconds?: number) {
  if (typeof document === 'undefined') return
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax']
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${maxAgeSeconds}`)
  if (window.location.protocol === 'https:') parts.push('Secure')
  document.cookie = parts.join('; ')
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const nameEq = `${encodeURIComponent(name)}=`
  const cookies = document.cookie.split(';')
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim()
    if (cookie.startsWith(nameEq)) return decodeURIComponent(cookie.slice(nameEq.length))
  }
  return null
}

function normalizeRole(role: string | number | undefined | null): RoleName {
  if (role == null) return 'USUARIO'

  // Convert to string
  const roleStr = String(role).trim()
  
  // First accept canonical values used across the app.
  const direct = roleStr.toUpperCase()
  if (direct === 'ADMIN' || direct === 'AGENTE_TI' || direct === 'USUARIO') return direct

  // Then map common backend / DB labels to canonical values.
  // Examples: "Administrador" | "Agente" | "Agente TI" | "Solicitante" | 1 | 2 | 3
  const simplified = roleStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')

  console.log('🔍 Normalizing role:', { original: roleStr, simplified })

  // Map to ADMIN (1)
  if (simplified === '1' || simplified === 'administrador' || simplified === 'admin') return 'ADMIN'
  
  // Map to AGENTE_TI (2)
  if (
    simplified === '2' ||
    simplified === 'agente' ||
    simplified === 'agente_ti' ||
    simplified === 'agente_it' ||
    simplified === 'soporte' ||
    simplified === 'soporte_ti' ||
    simplified === 'agente_de_soporte' ||
    simplified === 'agente_de_soporte_tecnico' ||
    simplified === 'agent_de_support_technique' ||
    simplified.includes('agente') && simplified.includes('soporte')
  )
    return 'AGENTE_TI'
  
  // Map to USUARIO (3)
  if (simplified === '3' || simplified === 'solicitante' || simplified === 'usuario' || simplified === 'user')
    return 'USUARIO'

  console.warn('⚠️ Unknown role format, defaulting to USUARIO:', roleStr)
  return 'USUARIO'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null as unknown as AuthUser,
    isAuthenticated: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = getCookie(STORAGE_TOKEN_KEY)
    const rawUser = window.localStorage.getItem(STORAGE_USER_KEY)

    if (!token || !rawUser) return

    try {
      const user = JSON.parse(rawUser) as AuthUser
      setSession({ user, isAuthenticated: true })
    } catch {
      window.localStorage.removeItem(STORAGE_USER_KEY)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await loginRequest({ Correo: email, ContrasenaHash: password })

      // Debug: Log what we received from backend
      console.log('🔐 Backend response received:', {
        userId: data.usuario.id,
        userRol: data.usuario.rol,
        userRolType: typeof data.usuario.rol,
      })

      // Prefer cookie so middleware can protect routes.
      // NOTE: This is NOT HttpOnly when set client-side.
      setCookie(STORAGE_TOKEN_KEY, data.token, 60 * 60 * 8)

      const normalizedRole = normalizeRole(data.usuario.rol)
      console.log('✅ Role normalized:', {
        original: data.usuario.rol,
        normalized: normalizedRole,
      })

      const user: AuthUser = {
        id: data.usuario.id,
        nombre: data.usuario.nombre,
        email: data.usuario.correo,
        rol: normalizedRole,
        area: 'Sin área',
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
        console.log('💾 User stored in localStorage:', user)
      }

      setSession({ user, isAuthenticated: true })
      console.log('📌 Session updated in AuthContext:', { user, isAuthenticated: true })
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_USER_KEY)
    }

    deleteCookie(STORAGE_TOKEN_KEY)

    logoutRequest()

    setSession({
      user: null as unknown as AuthUser,
      isAuthenticated: false,
    })

    window.location.href = '/'
  }, [])

  const hasRole = useCallback(
    (roles: RoleName[]): boolean => {
      if (!session.isAuthenticated) return false
      return roles.includes(session.user.rol)
    },
    [session]
  )

  const isAgent = session.isAuthenticated && ['ADMIN', 'AGENTE_TI'].includes(session.user?.rol)
  const isAdmin = session.isAuthenticated && session.user?.rol === 'ADMIN'

  return (
    <AuthContext.Provider value={{ session, login, logout, hasRole, isAgent, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
