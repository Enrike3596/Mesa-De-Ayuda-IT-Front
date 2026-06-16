'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { TicketForm } from '@/components/ticket-form'

export default function NewTicketPage() {
  const { session } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  return (
    <AppShell>
      <TicketForm />
    </AppShell>
  )
}
