'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import type { Notification } from './types'
import { listarNotificaciones, marcarComoLeida as marcarComoLeidaApi, marcarTodasComoLeidas as marcarTodasLeidasApi } from './api/notificacionService'
import { useAuth } from '@/lib/context/AuthContext'

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications
  const { session } = useAuth()

  const unreadCount = notifications.filter(n => !n.leida).length

  // Carga notificaciones al autenticarse y limpia al cerrar sesión
  useEffect(() => {
    if (!session.isAuthenticated) {
      setNotifications([])
      return
    }
    listarNotificaciones().then(setNotifications).catch(() => {})
  }, [session.isAuthenticated])

  const markAsRead = useCallback((id: number) => {
    marcarComoLeidaApi(id).catch(() => {})
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, leida: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    marcarTodasLeidasApi().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
  }, [])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'created_at'>) => {
    const exists = notificationsRef.current.some(
      n => n.ticket_id === notification.ticket_id && n.tipo === notification.tipo
    )
    if (exists) return

    const newNotification: Notification = {
      ...notification,
      id: Date.now(),
      created_at: new Date().toISOString(),
    }
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
