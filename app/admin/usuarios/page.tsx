'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { UsersManagement } from '@/components/admin/users-management'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
  const { session, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session.isAuthenticated) return
    if (!isAdmin) router.replace('/dashboard')
  }, [session.isAuthenticated, isAdmin, router])

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) return null

  return (
    <AppShell>
      <UsersManagement />
    </AppShell>
  )
}
