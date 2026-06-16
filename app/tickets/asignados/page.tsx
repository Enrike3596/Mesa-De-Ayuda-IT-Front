'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { TicketList } from '@/components/ticket-list'
import { AppShell } from '@/components/app-shell'
import { LoginForm } from '@/components/login-form'
import { redirect } from 'next/navigation'

export default function AsignadosPage() {
  const { session, isAgent } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  // Proteger la ruta: solo agentes pueden ver esta página
  if (!isAgent) {
    redirect('/dashboard')
  }

  return (
    <AppShell>
      <TicketList showAllTickets={false} showOnlyAssigned={true} />
    </AppShell>
  )
}
