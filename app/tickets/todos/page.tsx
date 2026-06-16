'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { TicketList } from '@/components/ticket-list'
import { AppShell } from '@/components/app-shell'
import { LoginForm } from '@/components/login-form'
import { useRouter } from 'next/navigation'

export default function AllTicketsPage() {
  const { session, isAgent } = useAuth()
  const router = useRouter()

  // Proteger la ruta: solo agentes y admin pueden ver todos los tickets
  useEffect(() => {
    if (!session.isAuthenticated) return
    if (!isAgent) router.replace('/dashboard')
  }, [session.isAuthenticated, isAgent, router])

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAgent) return null

  return (
    <AppShell>
      <div className="space-y-6">
        <TicketList showAllTickets={true} description="Listado global de solicitudes para agentes y administradores" />
      </div>
    </AppShell>
  )
}
