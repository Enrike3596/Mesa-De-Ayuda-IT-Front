'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { startConnection, stopConnection, getConnection } from '@/lib/signalr-service'
import { ticketsStore } from '@/lib/tickets-store'
import { enrichTicketWithSla, normalizeTicket } from '@/lib/api/ticketService'
import type { Ticket } from '@/lib/types'

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const startedRef = useRef(false)

  useEffect(() => {
    if (!session.isAuthenticated) {
      startedRef.current = false
      stopConnection()
      return
    }

    if (startedRef.current) return
    startedRef.current = true

    const connection = startConnection()

    const handleTicketActualizado = async (data: unknown) => {
      const normalized = await enrichTicketWithSla(normalizeTicket(data))
      ticketsStore.updateTicketInState(normalized)
    }

    const handleTicketCreado = (data: unknown) => {
      const normalized = normalizeTicket(data)
      ticketsStore.addTicketToState(normalized)
    }

    connection.on('TicketActualizado', handleTicketActualizado)
    connection.on('TicketCreado', handleTicketCreado)
    connection.on('comentarionuevo', handleTicketActualizado)

    return () => {
      const conn = getConnection()
      if (conn) {
        conn.off('TicketActualizado', handleTicketActualizado)
        conn.off('TicketCreado', handleTicketCreado)
        conn.off('comentarionuevo', handleTicketActualizado)
      }
      startedRef.current = false
      stopConnection()
    }
  }, [session.isAuthenticated])

  return <>{children}</>
}
