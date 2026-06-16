'use client'

import { use } from 'react'
import { TicketDetail } from '@/components/ticket-detail'
import { AppShell } from '@/components/app-shell'
import { LoginForm } from '@/components/login-form'
import { useAuth } from '@/lib/context/AuthContext'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function TicketPage({ params }: PageProps) {
  const { session } = useAuth()
  const resolvedParams = use(params)

  // Convertimos el ID de string a número para el componente
  const ticketId = parseInt(resolvedParams.id, 10)

  if (!session.isAuthenticated) {
    return <LoginForm />
  }
  
  return (
    <AppShell>
      <TicketDetail ticketId={ticketId} />
    </AppShell>
  )
}