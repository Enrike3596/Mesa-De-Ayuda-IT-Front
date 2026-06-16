'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { TicketList } from '@/components/ticket-list'
import { AppShell } from '@/components/app-shell'
import { LoginForm } from '@/components/login-form'
import { redirect } from 'next/navigation'

export default function AdminTicketsAsignadosPage() {
  const { session, isAdmin } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <AppShell>
      <TicketList showAllTickets={false} showOnlyAssigned={true} />
    </AppShell>
  )
}
