'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { PrioritiesManagement } from '@/components/admin/priorities-management'
import { redirect } from 'next/navigation'

export default function AdminPrioritiesPage() {
  const { session, isAdmin } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <AppShell>
      <PrioritiesManagement />
    </AppShell>
  )
}
