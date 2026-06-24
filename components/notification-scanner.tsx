'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useNotifications } from '@/lib/notifications-context'
import { useTickets } from '@/lib/tickets-store'
import type { Ticket, RoleName } from '@/lib/types'

const LAST_CHECK_KEY = 'notificaciones_ultima_revision'

function shouldNotify(currentUserId: number, currentRole: RoleName, ticket: Ticket): boolean {
  if (currentRole === 'ADMIN') return true
  if (ticket.usuario_id === currentUserId) return true
  if (ticket.asignado?.agente_id === currentUserId) return true
  return false
}

export function NotificationScanner() {
  const { session } = useAuth()
  const { addNotification } = useNotifications()
  const { tickets } = useTickets()
  const scannedRef = useRef(false)

  useEffect(() => {
    if (!session.isAuthenticated) {
      scannedRef.current = false
      return
    }

    if (!tickets.length || scannedRef.current) return
    scannedRef.current = true

    const userId = session.user?.id ?? 0
    const role = session.user?.rol
    if (!role) return

    const lastCheck = localStorage.getItem(LAST_CHECK_KEY)
    const now = new Date().toISOString()
    // En primera visita, notificar solo tickets de las últimas 24h
    const cutoff = lastCheck ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    for (const ticket of tickets) {
      if (!shouldNotify(userId, role, ticket)) continue

      if (ticket.created_at > cutoff) {
        addNotification({
          tipo: 'TICKET_CREADO',
          mensaje: `Nuevo ticket #${ticket.id}: ${ticket.titulo}`,
          ticket_id: ticket.id,
          leida: false,
        })
      } else if (ticket.updated_at > cutoff) {
        addNotification({
          tipo: 'TICKET_ACTUALIZADO',
          mensaje: `Ticket #${ticket.id} actualizado: ${ticket.titulo}`,
          ticket_id: ticket.id,
          leida: false,
        })
      }
    }

    localStorage.setItem(LAST_CHECK_KEY, now)
  }, [session.isAuthenticated, tickets, addNotification, session.user?.id, session.user?.rol])

  return null
}
