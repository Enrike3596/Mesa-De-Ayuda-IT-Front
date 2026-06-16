'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { AreasManagement } from '@/components/admin/areas-management'
import { redirect } from 'next/navigation'

export default function AdminAreasPage() {
  const { session, isAdmin } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <AppShell>
      <AreasManagement />
    </AppShell>
  )
}
