'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { useNotifications } from '@/lib/notifications-context'
import { startConnection, stopConnection, getConnection } from '@/lib/signalr-service'
import { ticketsStore } from '@/lib/tickets-store'
import { enrichTicketWithSla, normalizeTicket } from '@/lib/api/ticketService'
import { normalizeNotificacion } from '@/lib/api/notificacionService'
import type { Ticket, RoleName, Notification } from '@/lib/types'

function shouldNotify(currentUserId: number, currentRole: RoleName, ticket: Ticket): boolean {
  if (currentRole === 'ADMIN') return true
  if (ticket.usuario_id === currentUserId) return true
  if (ticket.asignado?.agente_id === currentUserId) return true
  return false
}

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const { addNotification } = useNotifications()
  const startedRef = useRef(false)

  const addNotif = useCallback((tipo: Notification['tipo'], mensaje: string, ticket_id: number) => {
    addNotification({ tipo, mensaje, ticket_id, leida: false })
  }, [addNotification])

  useEffect(() => {
    if (!session.isAuthenticated) {
      startedRef.current = false
      stopConnection()
      return
    }

    if (startedRef.current) return
    startedRef.current = true

    const connection = startConnection()
    const userId = session.user?.id ?? 0
    const role = session.user?.rol

    const handleTicketCreado = (data: unknown) => {
      const normalized = normalizeTicket(data)
      ticketsStore.addTicketToState(normalized)
      if (role && shouldNotify(userId, role, normalized)) {
        addNotif('TICKET_CREADO', `Nuevo ticket #${normalized.id}: ${normalized.titulo}`, normalized.id)
      }
    }

    const handleTicketActualizado = async (data: unknown) => {
      const normalized = await enrichTicketWithSla(normalizeTicket(data))
      ticketsStore.updateTicketInState(normalized)
      if (role && shouldNotify(userId, role, normalized)) {
        addNotif('TICKET_ACTUALIZADO', `Ticket #${normalized.id} actualizado: ${normalized.titulo}`, normalized.id)
      }
    }

    const handleComentarioNuevo = async (data: unknown) => {
      const normalized = await enrichTicketWithSla(normalizeTicket(data))
      ticketsStore.updateTicketInState(normalized)
      if (role && shouldNotify(userId, role, normalized)) {
        addNotif('COMENTARIO_NUEVO', `Nuevo comentario en ticket #${normalized.id}: ${normalized.titulo}`, normalized.id)
      }
    }

    const handleNotificacionCreada = (data: unknown) => {
      const notif = normalizeNotificacion(data)
      addNotification({ tipo: notif.tipo, mensaje: notif.mensaje, ticket_id: notif.ticket_id, leida: false })
    }

    connection.on('TicketActualizado', handleTicketActualizado)
    connection.on('TicketCreado', handleTicketCreado)
    connection.on('comentarionuevo', handleComentarioNuevo)
    connection.on('NotificacionCreada', handleNotificacionCreada)

    return () => {
      const conn = getConnection()
      if (conn) {
        conn.off('TicketActualizado', handleTicketActualizado)
        conn.off('TicketCreado', handleTicketCreado)
        conn.off('comentarionuevo', handleComentarioNuevo)
        conn.off('NotificacionCreada', handleNotificacionCreada)
      }
      startedRef.current = false
      stopConnection()
    }
  }, [session.isAuthenticated, session.user?.id, session.user?.rol, addNotif, addNotification])

  return <>{children}</>
}
