'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { SubcategoriesManagement } from '@/components/admin/subcategories-management'
import { redirect } from 'next/navigation'

export default function AdminSubcategoriesPage() {
  const { session, isAdmin } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) {
    redirect('/dashboard')
  }

  return (
    <AppShell>
      <SubcategoriesManagement />
    </AppShell>
  )
}
