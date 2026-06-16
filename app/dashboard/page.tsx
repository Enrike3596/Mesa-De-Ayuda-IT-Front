'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { Dashboard } from '@/components/dashboard'
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  const { session } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  )
}
