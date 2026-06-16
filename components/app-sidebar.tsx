'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Ticket,
  Plus,
  Users,
  Settings,
  FolderKanban,
  AlertTriangle,
  Building2,
  ListTree,
  X,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/lib/context/AuthContext'

interface AppSidebarProps {
  open: boolean
  onClose: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function AppSidebar({ open, onClose, collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const { session, isAgent, isAdmin } = useAuth()
  const isAgenteTI = session.user?.rol === 'AGENTE_TI'
  const isUsuario = session.user?.rol === 'USUARIO'

  const navItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: 'Mis Tickets',
      href: '/tickets',
      icon: Ticket,
      show: isUsuario,
    },
    {
      title: 'Todos los Tickets',
      href: '/tickets/todos',
      icon: FolderKanban,
      show: isAgent,
    },
    {
      title: 'Mis Tickets Asignados',
      href: '/tickets/asignados',
      icon: Ticket,
      show: isAgenteTI,
    },
    {
      title: 'Nuevo Ticket',
      href: '/tickets/nuevo',
      icon: Plus,
      show: true,
    },
  ]

  const adminItems = [
    {
      title: 'Mis Tickets Asignados',
      href: '/admin/tickets-asignados',
      icon: Ticket,
      show: isAdmin,
    },
    {
      title: 'Usuarios',
      href: '/admin/usuarios',
      icon: Users,
      show: isAdmin,
    },
    {
      title: 'Áreas',
      href: '/admin/areas',
      icon: Building2,
      show: isAdmin,
    },
    {
      title: 'Categorías',
      href: '/admin/categorias',
      icon: FolderKanban,
      show: isAdmin,
    },
    {
      title: 'Subcategorías',
      href: '/admin/subcategorias',
      icon: ListTree,
      show: isAdmin,
    },
    {
      title: 'Prioridades',
      href: '/admin/prioridades',
      icon: AlertTriangle,
      show: isAdmin,
    },
    {
      title: 'Configuración',
      href: '/admin/configuracion',
      icon: Settings,
      show: isAdmin,
    },
  ]

  function NavLink({
    item,
  }: {
    item: (typeof navItems)[number]
  }) {
    const link = (
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          pathname === item.href
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {collapsed ? <span className="sr-only">{item.title}</span> : item.title}
      </Link>
    )

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.title}
          </TooltipContent>
        </Tooltip>
      )
    }

    return link
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground',
          'border-r border-sidebar-border shadow-xl',
          'transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 lg:hidden">
          <span className="font-semibold">Menú</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems
              .filter(item => item.show)
              .map(item => (
                <NavLink key={`${item.href}-${item.title}`} item={item} />
              ))}
          </div>

          {isAdmin && (
            <>
              <div className="my-4 border-t border-sidebar-border" />
              <div className="space-y-1">
                {!collapsed && (
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    Administración
                  </p>
                )}
                {adminItems
                  .filter(item => item.show)
                  .map(item => (
                    <NavLink key={`${item.href}-${item.title}`} item={item} />
                  ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer with collapse toggle */}
        <div className="border-t border-sidebar-border p-3">
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className={cn(
                    'w-full text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    collapsed ? 'flex justify-center' : 'flex items-center justify-start gap-3 px-3'
                  )}
                >
                  <ChevronLeft className={cn(
                    'h-5 w-5 shrink-0',
                    collapsed && 'rotate-180'
                  )} />
                  {!collapsed && <span className="text-sm">Colapsar</span>}
                  {collapsed && <span className="sr-only">Expandir</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {collapsed ? 'Expandir menú' : 'Colapsar menú'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </>
  )
}
