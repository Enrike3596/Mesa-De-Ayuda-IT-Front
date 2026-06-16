'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Search,
  ChevronDown,
  Plus,
  Eye,
  Clock,
  User,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/context/AuthContext'
import { useTickets } from '@/lib/tickets-store'
import { listarCategorias } from '@/lib/api/categoriaService'
import { listarPrioridades } from '@/lib/api/prioridadService'
import { obtenerUsuarios, type UsuarioResponse } from '@/lib/api/usuarioService'
import { obtenerAsignados, obtenerTicketPorId } from '@/lib/api/ticketService'
import { isTicketCerradoVencido, isTicketVencido } from '@/lib/utils'
import type { Categoria, Prioridad, TicketEstado, Ticket, TicketAsignado } from '@/lib/types'

interface TicketListProps {
  showAllTickets?: boolean
  showOnlyAssigned?: boolean
  description?: string
}

const estadoOptions: { value: TicketEstado | 'TODOS' | 'VENCIDO'; label: string }[] = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'ABIERTO', label: 'Abierto' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'EN_ESPERA', label: 'En espera' },
  { value: 'PROGRAMADO', label: 'Programado' },
  { value: 'PENDIENTE_CONFIRMACION', label: 'Pendiente Confirmación' },
  { value: 'REABIERTO', label: 'Reabierto' },
  { value: 'CERRADO', label: 'Cerrado' },
  { value: 'RESUELTO', label: 'Resuelto' },
]

export function TicketList({ showAllTickets = false, showOnlyAssigned = false, description }: TicketListProps) {
  const { session, isAgent, isAdmin } = useAuth()
  const { tickets } = useTickets()
  const [searchQuery, setSearchQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<TicketEstado | 'TODOS' | 'VENCIDO'>('TODOS')
  const [categoriaFilter, setCategoriaFilter] = useState<number | null>(null)
  const [prioridadFilter, setPrioridadFilter] = useState<number | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [usuariosCatalogo, setUsuariosCatalogo] = useState<UsuarioResponse[]>([])
  const [asignadosCatalogo, setAsignadosCatalogo] = useState<TicketAsignado[]>([])
  const [ticketDetalles, setTicketDetalles] = useState<Record<number, Ticket>>({})
  const [loadingTicketIds, setLoadingTicketIds] = useState<Set<number>>(new Set())
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  
  // Variables estables para dependencies
  const currentUserId = session.user?.id ?? 0
  const isAgenteTI = session.user?.rol === 'AGENTE_TI'

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [cats, prios, users, asignados] = await Promise.all([
          listarCategorias(),
          listarPrioridades(),
          obtenerUsuarios(),
          obtenerAsignados(),
        ])
        if (!mounted) return
        setCategorias(Array.isArray(cats) ? cats : [])
        setPrioridades(Array.isArray(prios) ? prios : [])
        setUsuariosCatalogo(Array.isArray(users) ? users : [])
        setAsignadosCatalogo(Array.isArray(asignados) ? asignados : [])
      } catch {
        if (!mounted) return
        setCategorias([])
        setPrioridades([])
        setUsuariosCatalogo([])
        setAsignadosCatalogo([])
      } finally {
        if (!mounted) return
        setLoadingCatalog(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const closedTickets = tickets.filter(
      (ticket) =>
        (ticket.estado === 'CERRADO' || ticket.estado === 'RESUELTO') &&
        !ticketDetalles[ticket.id] &&
        !loadingTicketIds.has(ticket.id)
    )

    if (closedTickets.length === 0) return

    // Mark tickets as loading
    setLoadingTicketIds((prev) => {
      const next = new Set(prev)
      closedTickets.forEach((t) => next.add(t.id))
      return next
    })

    Promise.allSettled(closedTickets.map((ticket) => obtenerTicketPorId(ticket.id))).then((results) => {
      if (!mounted) return

      const loaded: Record<number, Ticket> = {}
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        
        if (result.status === 'fulfilled') {
          loaded[result.value.id] = result.value
        }
      }

      if (Object.keys(loaded).length > 0) {
        setTicketDetalles((prev) => ({ ...prev, ...loaded }))
      }
      
      // Remove from loading set
      setLoadingTicketIds((prev) => {
        const next = new Set(prev)
        closedTickets.forEach((t) => next.delete(t.id))
        return next
      })
    })

    return () => {
      mounted = false
    }
  }, [tickets])

  const getTicketConDetalle = (ticket: Ticket): Ticket => {
    const detalle = ticketDetalles[ticket.id]
    return detalle ? { ...ticket, ...detalle } : ticket
  }

  const filteredTickets = useMemo(() => {
    let result = tickets

    // Filter by context
    if (showOnlyAssigned && (isAgenteTI || isAdmin) && currentUserId) {
      // Mostrar solo tickets asignados al agente actual
      result = result.filter((t) => {
        const fromTicket = t.asignado?.agente_id === currentUserId
        const fromCatalog = asignadosCatalogo.some((a) => a.ticket_id === t.id && a.agente_id === currentUserId)
        return fromTicket || fromCatalog
      })
    } else if (!showAllTickets) {
      // Mostrar "Mis Tickets" (tickets del usuario actual)
      if (isAgenteTI && currentUserId) {
        result = result.filter((t) => {
          const fromTicket = t.asignado?.agente_id === currentUserId
          const fromCatalog = asignadosCatalogo.some((a) => a.ticket_id === t.id && a.agente_id === currentUserId)
          return fromTicket || fromCatalog
        })
      } else if (!isAgent) {
        result = result.filter(t => t.usuario_id === currentUserId)
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        t =>
          t.titulo.toLowerCase().includes(query) ||
          t.descripcion.toLowerCase().includes(query) ||
          t.id.toString().includes(query)
      )
    }

    // Estado filter
    if (estadoFilter === 'VENCIDO') {
      result = result.filter((t) => {
        const ticketConDetalle = getTicketConDetalle(t)
        const ticketParaSla = ticketConDetalle.prioridad
          ? ticketConDetalle
          : { ...ticketConDetalle, prioridad: prioridades.find((p) => p.Id === ticketConDetalle.prioridad_id) }
        return isTicketVencido(ticketParaSla) || isTicketCerradoVencido(ticketParaSla)
      })
    } else if (estadoFilter === 'CERRADO') {
      // For CERRADO filter, exclude vencidos (they are shown separately with VENCIDO filter)
      result = result.filter((t) => {
        const ticketConDetalle = getTicketConDetalle(t)
        return ticketConDetalle.estado === 'CERRADO' && !isTicketCerradoVencido(ticketConDetalle)
      })
    } else if (estadoFilter !== 'TODOS') {
      result = result.filter(t => t.estado === estadoFilter)
    }

    // Categoria filter
    if (categoriaFilter) {
      result = result.filter(t => t.categoria_id === categoriaFilter)
    }

    // Prioridad filter
    if (prioridadFilter) {
      result = result.filter(t => t.prioridad_id === prioridadFilter)
    }

    return result
  }, [
    tickets,
    showAllTickets,
    showOnlyAssigned,
    isAgent,
    isAgenteTI,
    currentUserId,
    asignadosCatalogo,
    prioridades,
    ticketDetalles,
    searchQuery,
    estadoFilter,
    categoriaFilter,
    prioridadFilter,
  ])

  const getEstadoBadge = (ticket: Ticket) => {
    const normalized = String(ticket.estado)
      .trim()
      .toUpperCase()
      .replace(/-/g, '_')
      .replace(/\s+/g, '_') as TicketEstado

    if (isTicketCerradoVencido(ticket)) {
      return <Badge className="bg-red-600 text-white">Cerrado Vencido</Badge>
    }

    const config: Record<string, { className: string; label: string }> = {
      ABIERTO: { className: 'bg-accent text-accent-foreground', label: 'Abierto' },
      EN_PROCESO: { className: 'bg-teal-500 text-white', label: 'En proceso' },
      EN_ESPERA: { className: 'bg-yellow-500 text-black', label: 'En espera' },
      PROGRAMADO: { className: 'bg-blue-500 text-white', label: 'Programado' },
      PENDIENTE_CONFIRMACION: { className: 'bg-purple-500 text-white', label: 'Pendiente Confirmación' },
      REABIERTO: { className: 'bg-orange-500 text-white', label: 'Reabierto' },
      CERRADO: { className: 'bg-muted text-muted-foreground', label: 'Cerrado' },
      RESUELTO: { className: 'bg-green-600 text-white', label: 'Resuelto' },
    }
    const statusConfig = config[normalized] || {
      className: 'bg-muted text-muted-foreground',
      label: normalized || 'Desconocido',
    }
    const { className, label } = statusConfig
    return <Badge className={className}>{label}</Badge>
  }

  const getPrioridadBadge = (prioridad: string) => {
    const config: Record<string, { className: string }> = {
      Crítica: { className: 'bg-red-700 text-white' },
      Alta: { className: 'bg-red-500 text-white' },
      Media: { className: 'bg-yellow-300 text-black' },
      Baja: { className: 'bg-blue-300 text-black' },
    }
    const { className } = config[prioridad] || { className: '' }
    return <Badge className={className}>{prioridad}</Badge>
  }

  const clearFilters = () => {
    setSearchQuery('')
    setEstadoFilter('TODOS')
    setCategoriaFilter(null)
    setPrioridadFilter(null)
  }

  const hasActiveFilters = searchQuery || estadoFilter !== 'TODOS' || categoriaFilter || prioridadFilter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {showAllTickets ? 'Todos los Tickets' : showOnlyAssigned ? 'Mis Tickets Asignados' : 'Mis Tickets'}
          </h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
          <p className="text-muted-foreground">
            {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} encontrado{filteredTickets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/tickets/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Ticket
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Estado */}
            <Select
              value={estadoFilter}
              onValueChange={(value) => setEstadoFilter(value as TicketEstado | 'TODOS' | 'VENCIDO')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {estadoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Categoria */}
            <Select
              value={categoriaFilter?.toString() || 'all'}
              onValueChange={(value) => setCategoriaFilter(value === 'all' ? null : parseInt(value))}
              disabled={loadingCatalog || categorias.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categorias.filter(c => c.Estado).map((cat) => (
                  <SelectItem key={cat.Id} value={cat.Id.toString()}>
                    {cat.Nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Prioridad */}
            <Select
              value={prioridadFilter?.toString() || 'all'}
              onValueChange={(value) => setPrioridadFilter(value === 'all' ? null : parseInt(value))}
              disabled={loadingCatalog || prioridades.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                {prioridades.filter(p => p.Estado).map((prio) => (
                  <SelectItem key={prio.Id} value={prio.Id.toString()}>
                    {prio.Nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No se encontraron tickets</h3>
              <p className="mt-1 text-center text-muted-foreground">
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no tienes tickets creados'}
              </p>
              {!hasActiveFilters && (
                <Button asChild className="mt-4">
                  <Link href="/tickets/nuevo">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primer ticket
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
              const ticketConDetalle = getTicketConDetalle(ticket)
              const creadorNombre =
                ticket.usuario?.Nombre ||
                (ticket.usuario as any)?.nombre ||
                usuariosCatalogo.find((u) => (u.id ?? (u as any).Id) === ticket.usuario_id)?.nombre ||
                usuariosCatalogo.find((u) => (u.id ?? (u as any).Id) === ticket.usuario_id)?.Nombre ||
                `Usuario #${ticket.usuario_id}`

              const categoriaNombre =
                ticket.categoria?.Nombre ||
                (ticket.categoria as any)?.nombre ||
                categorias.find((c) => c.Id === ticket.categoria_id)?.Nombre ||
                `Categoría #${ticket.categoria_id}`

              const prioridadCatalogo = prioridades.find((p) => p.Id === ticketConDetalle.prioridad_id)
              const ticketParaSla = ticketConDetalle.prioridad ? ticketConDetalle : { ...ticketConDetalle, prioridad: prioridadCatalogo }

              const prioridadNombre =
                ticket.prioridad?.Nombre ||
                (ticket.prioridad as any)?.nombre ||
                prioridadCatalogo?.Nombre ||
                `Prioridad #${ticket.prioridad_id}`

              const asignadoNombre = (() => {
                const a = ticket.asignado || asignadosCatalogo.find((x) => x.ticket_id === ticket.id)
                if (!a) return ''
                return (
                  a.agente?.Nombre ||
                  (a.agente as any)?.nombre ||
                  usuariosCatalogo.find((u) => (u.id ?? (u as any).Id) === a.agente_id)?.nombre ||
                  usuariosCatalogo.find((u) => (u.id ?? (u as any).Id) === a.agente_id)?.Nombre ||
                  ''
                )
              })()

              return (
            <Card key={ticket.id} className="transition-colors hover:bg-muted/30">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="text-lg font-semibold hover:text-primary hover:underline"
                      >
                        #{ticket.id} - {ticket.titulo}
                      </Link>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {ticket.descripcion}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {creadorNombre}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {categoriaNombre}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {ticket.created_at && !isNaN(new Date(ticket.created_at).getTime())
                          ? formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: es })
                          : 'Fecha desconocida'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                    <div className="flex gap-2">
                      {getPrioridadBadge(prioridadNombre)}
                      {getEstadoBadge(ticketParaSla)}
                      {isTicketVencido(ticketParaSla) && !isTicketCerradoVencido(ticketParaSla) && (
                        <Badge className="bg-red-600 text-white">Ticket Vencido</Badge>
                      )}
                      {(isAgent || isAdmin) && ticket.estado_sla === 'Pausado' && (
                        <Badge className="bg-yellow-500 text-black">Ticket Pausado</Badge>
                      )}
                    </div>
                    {asignadoNombre && (
                      <span className="text-xs text-muted-foreground">
                        Asignado a: {asignadoNombre}
                      </span>
                    )}
                    <Button variant="outline" size="sm" asChild className="mt-2 lg:mt-0">
                      <Link href={`/tickets/${ticket.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
              )
            })
        )}
      </div>
    </div>
  )
}
