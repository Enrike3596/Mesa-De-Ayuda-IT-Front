'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AppHeader } from './app-header'
import { AppSidebar } from './app-sidebar'

const STORAGE_KEY = 'sidebar_collapsed'

function getInitialCollapsed(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  }
  return false
}

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  const handleToggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  return (
    <div className="flex min-h-screen min-w-0" style={{ width: '100vw', overflowX: 'clip' }}>
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-all duration-300',
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
        style={{ scrollbarGutter: 'stable' }}
      >
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6" style={{ scrollbarGutter: 'stable' }}>{children}</main>
      </div>
    </div>
  )
}
