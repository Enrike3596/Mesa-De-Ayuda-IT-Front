'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { CategoriesManagement } from '@/components/admin/categories-management'
import { redirect } from 'next/navigation'

export default function AdminCategoriesPage() {
  const { session, isAdmin } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <AppShell>
      <CategoriesManagement />
    </AppShell>
  )
}
