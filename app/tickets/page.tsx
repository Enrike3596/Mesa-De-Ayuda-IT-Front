'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { TicketList } from '@/components/ticket-list'
import { useRouter } from 'next/navigation'

export default function TicketsPage() {
  const { session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session.isAuthenticated) return
    // Proteger la ruta: solo usuarios finales pueden acceder a "Mis Tickets"
    if (session.user?.rol === 'AGENTE_TI') router.replace('/tickets/asignados')
    if (session.user?.rol === 'ADMIN') router.replace('/tickets/todos')
  }, [session.isAuthenticated, session.user?.rol, router])

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (session.user?.rol === 'AGENTE_TI' || session.user?.rol === 'ADMIN') return null

  return (
    <AppShell>
      <TicketList />
    </AppShell>
  )
}
