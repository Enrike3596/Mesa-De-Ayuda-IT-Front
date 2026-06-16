'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Timer,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import { useTickets } from '@/lib/tickets-store'
import { listarCategorias } from '@/lib/api/categoriaService'
import { listarPrioridades } from '@/lib/api/prioridadService'
import { obtenerUsuarios } from '@/lib/api/usuarioService'
import { obtenerAsignados, obtenerTicketPorId } from '@/lib/api/ticketService'
import { isTicketCerradoVencido, isTicketVencido } from '@/lib/utils'
import type { DashboardStats, TicketsPorCategoria, TicketsPorDia, Ticket as TicketType, TicketAsignado } from '@/lib/types'
import type { UsuarioResponse } from '@/lib/api/usuarioService'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import Link from 'next/link'

const COLORS = [
  'oklch(0.35 0.14 305)', // Primary purple
  'oklch(0.50 0.20 330)', // Magenta
  'oklch(0.35 0.08 260)', // Dark blue
  'oklch(0.60 0.12 200)', // Teal
  'oklch(0.65 0.15 305)', // Light purple
  'oklch(0.45 0.10 260)', // Medium blue
]

const STATUS_COLORS: Record<string, string> = {
  ABIERTO: 'oklch(0.60 0.12 200)',
  // Slightly different hue from ABIERTO to distinguish in charts
  EN_PROCESO: 'oklch(31.516% 0.21566 264.118)',
  EN_ESPERA: 'oklch(0.70 0.15 85)',
  PROGRAMADO: 'oklch(40.458% 0.12736 139.546)',
  CERRADO: 'oklch(63.458% 0.21176 142.944)',
  CERRADO_VENCIDO: 'oklch(0.58 0.24 25)',
}

type DashboardPrioridad = { Id: number; Nombre: string; Hora_sla: number }

function withCatalogPriority(ticket: TicketType, prioridadesCatalogo: DashboardPrioridad[]): TicketType {
  if (ticket.prioridad?.Hora_sla || (ticket.prioridad as any)?.hora_sla || ticket.horas_sla) return ticket

  const prioridad = prioridadesCatalogo.find((p) => p.Id === ticket.prioridad_id)
  return prioridad
    ? { ...ticket, prioridad: { ...prioridad, Tipo: '', Estado: true } }
    : ticket
}

function startOfDay(date: Date) {
  const d = new Date(date)
  if (!isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0)
  }
  return d
}

function toISODate(d: Date) {
  if (isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

export function Dashboard() {
  const { session, isAgent } = useAuth()
  const { tickets } = useTickets()
  const [categoriasCatalogo, setCategoriasCatalogo] = useState<Array<{ Id: number; Nombre: string }>>([])
  const [prioridadesCatalogo, setPrioridadesCatalogo] = useState<DashboardPrioridad[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [asignaciones, setAsignaciones] = useState<TicketAsignado[]>([])
  const [ticketDetalles, setTicketDetalles] = useState<Record<number, TicketType>>({})
  const [loadingTicketIds, setLoadingTicketIds] = useState<Set<number>>(new Set())
  const isUsuario = session.user?.rol === 'USUARIO'
  const userId = session.user?.id ?? 0

  // Debug: Log role information
  if (typeof window !== 'undefined') {
    console.log('📊 Dashboard role info:', {
      rol: session.user?.rol,
      isAgent,
      isUsuario,
      userId,
      authenticated: session.isAuthenticated,
    })
  }

  useEffect(() => {
    let mounted = true

    const loadCategorias = async () => {
      try {
        const [categorias, prioridades] = await Promise.all([listarCategorias(), listarPrioridades()])
        if (!mounted) return
        const mappedCats = (Array.isArray(categorias) ? categorias : []).map((c: any) => ({
          Id: c?.Id ?? c?.id ?? 0,
          Nombre: c?.Nombre ?? c?.nombre ?? `Categoría #${c?.Id ?? c?.id ?? 0}`,
        }))
        const mappedPrios = (Array.isArray(prioridades) ? prioridades : []).map((p: any) => ({
          Id: p?.Id ?? p?.id ?? 0,
          Nombre: p?.Nombre ?? p?.nombre ?? `Prioridad #${p?.Id ?? p?.id ?? 0}`,
          Hora_sla: p?.Hora_sla ?? p?.hora_sla ?? p?.horaSla ?? p?.horas_sla ?? p?.sla ?? 0,
        }))
        setCategoriasCatalogo(mappedCats)
        setPrioridadesCatalogo(mappedPrios)
      } catch {
        if (!mounted) return
        setCategoriasCatalogo([])
        setPrioridadesCatalogo([])
      }
    }

    const loadUsuarios = async () => {
      try {
        const data = await obtenerUsuarios()
        if (!mounted) return
        setUsuarios(Array.isArray(data) ? data : [])
      } catch {
        if (!mounted) return
        setUsuarios([])
      }
    }

    const loadAsignaciones = async () => {
      try {
        const data = await obtenerAsignados()
        if (!mounted) return
        setAsignaciones(Array.isArray(data) ? data : [])
      } catch {
        if (!mounted) return
        setAsignaciones([])
      }
    }

    loadCategorias()
    loadUsuarios()
    loadAsignaciones()
    return () => {
      mounted = false
    }
  }, [])

  // Load details for closed tickets to get complete SLA information
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

      const loaded: Record<number, TicketType> = {}
      const failedIds = new Set<number>()
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const ticketId = closedTickets[i].id
        
        if (result.status === 'fulfilled') {
          loaded[result.value.id] = result.value
        } else {
          failedIds.add(ticketId)
        }
      }

      if (Object.keys(loaded).length > 0) {
        setTicketDetalles((prev) => ({ ...prev, ...loaded }))
      }
      
      // Remove from loading set (successful or failed)
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

  const getTicketConDetalle = (ticket: TicketType): TicketType => {
    const detalle = ticketDetalles[ticket.id]
    return detalle ? { ...ticket, ...detalle } : ticket
  }

  const dashboardStats: DashboardStats = useMemo(() => {
    // Filtrar tickets según el rol
    const relevantTickets = isUsuario
      ? tickets.filter(t => t.usuario_id === userId)
      : tickets
    // Enriquecer tickets cerrados con sus detalles completos antes de calcular SLA
    const enrichedTickets = relevantTickets.map(t => getTicketConDetalle(t))
    const relevantTicketsForSla = enrichedTickets.map((ticket) => withCatalogPriority(ticket, prioridadesCatalogo))

    const totalTickets = relevantTickets.length
    const byEstado = (estado: string) => relevantTickets.filter(t => t.estado === estado).length

    const today = startOfDay(new Date())
    const ticketsHoy = relevantTickets.filter(t => {
      const created = new Date(t.created_at)
      return startOfDay(created).getTime() === today.getTime()
    }).length

    const resolved = relevantTicketsForSla.filter(t => t.estado === 'CERRADO' && (t.fecha_resolucion || t.fecha_confirmacion_cierre || t.updated_at))
    const avgResolutionHours = resolved.length
      ? resolved.reduce((acc, t) => {
        const created = new Date(t.created_at).getTime()
        const resolvedAt = new Date(t.fecha_resolucion ?? t.fecha_confirmacion_cierre ?? t.updated_at).getTime()
        const hours = Math.max(0, (resolvedAt - created) / (1000 * 60 * 60))
        return acc + hours
      }, 0) / resolved.length
      : 0

    const sla = resolved.reduce(
      (acc, t) => {
        const slaHours = t.horas_sla || t.prioridad?.Hora_sla || (t.prioridad as any)?.hora_sla
        if (!slaHours) return acc
        const created = new Date(t.created_at).getTime()
        const resolvedAt = new Date(t.fecha_resolucion ?? t.fecha_confirmacion_cierre ?? t.updated_at).getTime()
        const hours = Math.max(0, (resolvedAt - created) / (1000 * 60 * 60))
        if (hours <= slaHours) acc.cumplidos += 1
        else acc.incumplidos += 1
        return acc
      },
      { cumplidos: 0, incumplidos: 0 }
    )

    const ticketsVencidos = relevantTicketsForSla.filter(t =>
      isTicketVencido(t) ||
      isTicketCerradoVencido(t)
    ).length

    // Calculate closed tickets excluding vencidos (expired)
    const cerradosEnTiempo = relevantTicketsForSla.filter(t => t.estado === 'CERRADO' && !isTicketCerradoVencido(t)).length

    return {
      totalTickets,
      ticketsAbiertos: byEstado('ABIERTO'),
      ticketsEnProgreso: byEstado('EN_PROCESO'),
      ticketsPendientes: byEstado('PROGRAMADO'),
      ticketsResueltos: byEstado('CERRADO'),
      ticketsCerrados: cerradosEnTiempo,
      ticketsHoy,
      ticketsVencidos,
      tiempoPromedioResolucion: Number.isFinite(avgResolutionHours) ? Math.round(avgResolutionHours * 10) / 10 : 0,
      ticketsPorSLA: sla,
    }
  }, [tickets, userId, isUsuario, prioridadesCatalogo, Object.keys(ticketDetalles).length])

  const statusData = useMemo(() => {
    const relevantTickets = isUsuario ? tickets.filter(t => t.usuario_id === userId) : tickets
    // Enriquecer tickets cerrados con sus detalles completos
    const enrichedTickets = relevantTickets.map(t => getTicketConDetalle(t))
    const relevantTicketsForSla = enrichedTickets.map((ticket) => withCatalogPriority(ticket, prioridadesCatalogo))
    const byEstado = (estado: string) => relevantTicketsForSla.filter(t => t.estado === estado).length
    const cerradosVencidos = relevantTicketsForSla.filter(isTicketCerradoVencido).length
    const cerradosEnTiempo = relevantTicketsForSla.filter(t => t.estado === 'CERRADO' && !isTicketCerradoVencido(t)).length

    const items = [
      { key: 'ABIERTO', name: 'Abiertos', value: byEstado('ABIERTO') },
      { key: 'EN_PROCESO', name: 'En proceso', value: byEstado('EN_PROCESO') },
      { key: 'EN_ESPERA', name: 'En espera', value: byEstado('EN_ESPERA') },
      { key: 'PROGRAMADO', name: 'Programados', value: byEstado('PROGRAMADO') },
      { key: 'CERRADO', name: 'Cerrados', value: cerradosEnTiempo },
      { key: 'CERRADO_VENCIDO', name: 'Cerrado Vencido', value: cerradosVencidos },
    ]

    return items
      .filter(i => i.value > 0)
      .map(i => ({ name: i.name, value: i.value, color: STATUS_COLORS[i.key] }))
  }, [tickets, userId, isUsuario, prioridadesCatalogo, Object.keys(ticketDetalles).length])

  const ticketsPorCategoria: TicketsPorCategoria[] = useMemo(() => {
    // Filtrar tickets según el rol
    const relevantTickets = isUsuario
      ? tickets.filter(t => t.usuario_id === userId)
      : tickets

    const map = new Map<number, number>()
    for (const t of relevantTickets) {
      const categoriaId = t.categoria_id || 0
      map.set(categoriaId, (map.get(categoriaId) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([categoriaId, count]) => {
        const categoria =
          relevantTickets.find((t) => t.categoria_id === categoriaId)?.categoria?.Nombre ||
          (relevantTickets.find((t) => t.categoria_id === categoriaId)?.categoria as any)?.nombre ||
          categoriasCatalogo.find((c) => c.Id === categoriaId)?.Nombre ||
          `Categoría #${categoriaId}`

        return { categoria, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [tickets, categoriasCatalogo, userId, isUsuario])

  const ticketsPorDia: TicketsPorDia[] = useMemo(() => {
    // Filtrar tickets según el rol
    const relevantTickets = isUsuario
      ? tickets.filter(t => t.usuario_id === userId)
      : tickets

    const days = 7
    const now = startOfDay(new Date())
    const byDate = new Map<string, { abiertos: number; resueltos: number }>()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      byDate.set(toISODate(d), { abiertos: 0, resueltos: 0 })
    }

    for (const t of relevantTickets) {
      const createdKey = toISODate(startOfDay(new Date(t.created_at)))
      if (byDate.has(createdKey)) byDate.get(createdKey)!.abiertos += 1

      if (t.fecha_resolucion) {
        const resolvedKey = toISODate(startOfDay(new Date(t.fecha_resolucion)))
        if (byDate.has(resolvedKey)) byDate.get(resolvedKey)!.resueltos += 1
      }
    }

    return Array.from(byDate.entries()).map(([fecha, v]) => ({ fecha, abiertos: v.abiertos, resueltos: v.resueltos }))
  }, [tickets, userId, isUsuario])
  
  const misTickets = useMemo(() => {
    if (isUsuario) return []
    return tickets.filter(t => t.asignado?.agente_id === userId)
  }, [tickets, userId, isUsuario])

  const misTicketsPorEstado = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of misTickets) {
      counts[t.estado] = (counts[t.estado] ?? 0) + 1
    }
    return [
      { key: 'ABIERTO', label: 'Abiertos', value: counts.ABIERTO ?? 0 },
      { key: 'EN_PROCESO', label: 'En Proceso', value: counts.EN_PROCESO ?? 0 },
      { key: 'EN_ESPERA', label: 'En Espera', value: counts.EN_ESPERA ?? 0 },
      { key: 'PROGRAMADO', label: 'Programados', value: counts.PROGRAMADO ?? 0 },
      { key: 'PENDIENTE_CONFIRMACION', label: 'Pendientes', value: counts.PENDIENTE_CONFIRMACION ?? 0 },
      { key: 'RESUELTO', label: 'Resueltos', value: counts.RESUELTO ?? 0 },
      { key: 'CERRADO', label: 'Cerrados', value: counts.CERRADO ?? 0 },
    ].filter(s => s.value > 0)
  }, [misTickets])

  const misTicketsRecientes = useMemo(() => {
    if (isUsuario) return []
    return misTickets.slice(0, 5)
  }, [misTickets, isUsuario])

  const agentesStats = useMemo(() => {
    const esAdminOAgente = (u: UsuarioResponse): boolean => {
      const rolRaw = u.Rol ?? u.rol
      const raw = rolRaw != null
        ? (typeof rolRaw === 'object'
            ? String((rolRaw as any).Nombre ?? (rolRaw as any).nombre ?? '')
            : String(rolRaw))
        : ''
      const simplified = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s-]+/g, '_')
        .trim()
      if (
        simplified === 'admin' ||
        simplified === 'administrador' ||
        simplified === '1' ||
        simplified === 'agente_ti' ||
        simplified === 'agente' ||
        simplified === 'soporte' ||
        simplified === 'soporte_ti' ||
        simplified === 'agente_de_soporte' ||
        simplified === 'agente_de_soporte_tecnico' ||
        simplified === '2' ||
        (simplified.includes('agente') && simplified.includes('soporte'))
      ) {
        return true
      }
      const rolId = u.RolId ?? u.rolId
      return rolId === 1 || rolId === 2
    }

    const agentes = usuarios.filter(u => esAdminOAgente(u))

    const ticketPorAgente = new Map<number, TicketType[]>()
    for (const ticket of tickets) {
      const asignacion = asignaciones.find(a => a.ticket_id === ticket.id)
      if (!asignacion) continue
      const agenteId = asignacion.agente_id
      if (!ticketPorAgente.has(agenteId)) {
        ticketPorAgente.set(agenteId, [])
      }
      ticketPorAgente.get(agenteId)!.push(ticket)
    }

    return agentes.map(agente => {
      const agenteId = agente.Id ?? agente.id ?? 0
      const assigned = ticketPorAgente.get(agenteId) ?? []
      const byEstado: Record<string, number> = {}
      for (const t of assigned) {
        byEstado[t.estado] = (byEstado[t.estado] ?? 0) + 1
      }
      const estadoOrder = ['ABIERTO', 'EN_PROCESO', 'EN_ESPERA', 'PROGRAMADO', 'PENDIENTE_CONFIRMACION', 'RESUELTO', 'CERRADO']
      const porEstado = estadoOrder
        .map(estado => ({ estado, count: byEstado[estado] ?? 0 }))
        .filter(e => e.count > 0)

      return {
        id: agenteId,
        nombre: agente.Nombre ?? agente.nombre ?? 'Sin nombre',
        totalTickets: assigned.length,
        porEstado,
      }
    }).sort((a, b) => b.totalTickets - a.totalTickets)
  }, [usuarios, tickets, asignaciones])

  const statCards = [
    {
      title: 'Total Tickets',
      value: dashboardStats.totalTickets,
      icon: Ticket,
      description: 'Tickets en el sistema',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Abiertos',
      value: dashboardStats.ticketsAbiertos,
      icon: AlertCircle,
      description: 'Pendientes de atención',
      color: 'bg-accent/10 text-accent',
    },
    {
      title: 'En proceso',
      value: dashboardStats.ticketsEnProgreso,
      icon: Clock,
      description: 'En proceso de atención',
      color: 'bg-accent/10 text-accent',
    },
    {
      title: 'Vencidos',
      value: dashboardStats.ticketsVencidos,
      icon: AlertTriangle,
      description: 'Excedieron tiempo de resolución',
      color: 'bg-red-500/10 text-red-600',
    },
  ]

  const agentCards = [
    {
      title: 'Tickets Hoy',
      value: dashboardStats.ticketsHoy,
      icon: TrendingUp,
      description: 'Nuevos tickets hoy',
      color: 'bg-secondary/10 text-secondary',
    },
    {
      title: 'Tiempo Promedio',
      value: `${dashboardStats.tiempoPromedioResolucion}h`,
      icon: Timer,
      description: 'Tiempo de resolución',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Vencidos',
      value: dashboardStats.ticketsVencidos,
      icon: AlertTriangle,
      description: 'Excedieron tiempo de resolución',
      color: 'bg-red-500/10 text-red-600',
    },
    {
      title: 'SLA Cumplido',
      value: `${Math.round((dashboardStats.ticketsPorSLA.cumplidos / dashboardStats.totalTickets) * 100)}%`,
      icon: CheckCircle2,
      description: `${dashboardStats.ticketsPorSLA.cumplidos} de ${dashboardStats.totalTickets}`,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      title: 'SLA Incumplido',
      value: dashboardStats.ticketsPorSLA.incumplidos,
      icon: AlertCircle,
      description: 'Requieren atención',
      color: 'bg-destructive/10 text-destructive',
    },
  ]

  const displayCards = isAgent ? [...statCards.slice(0, 2), ...agentCards.slice(0, 3)] : statCards

  const getEstadoBadge = (estadoOrTicket: string | TicketType, slaEstado?: string | null) => {
    const ticket = typeof estadoOrTicket === 'string' ? null : estadoOrTicket
    const estado = typeof estadoOrTicket === 'string' ? estadoOrTicket : estadoOrTicket.estado

    if (ticket ? isTicketCerradoVencido(ticket) : estado === 'CERRADO' && slaEstado === 'Resuelto Vencido') {
      return <Badge className="bg-red-600 text-white">Cerrado Vencido</Badge>
    }
    const config: Record<string, { className: string; label: string }> = {
      ABIERTO: { className: 'bg-accent text-accent-foreground', label: 'Abierto' },
      EN_PROCESO: { className: 'bg-teal-500 text-white', label: 'En proceso' },
      EN_ESPERA: { className: 'bg-yellow-500 text-black', label: 'En espera' },
      PROGRAMADO: { className: 'bg-blue-500 text-white', label: 'Programado' },
      PENDIENTE_CONFIRMACION: { className: 'bg-purple-500 text-white', label: 'Pendiente' },
      REABIERTO: { className: 'bg-orange-500 text-white', label: 'Reabierto' },
      RESUELTO: { className: 'bg-green-600 text-white', label: 'Resuelto' },
      CERRADO: { className: 'bg-muted text-muted-foreground', label: 'Cerrado' },
    }
    const { className, label } = config[estado] || { className: 'bg-muted text-muted-foreground', label: estado }
    return <Badge className={className}>{label}</Badge>
  }

  const getPrioridadBadge = (ticket: TicketType) => {
    const prioridadNombre =
      ticket.prioridad?.Nombre ||
      (ticket.prioridad as any)?.nombre ||
      prioridadesCatalogo.find((p) => p.Id === ticket.prioridad_id)?.Nombre ||
      ''

    const variants: Record<string, { className: string, label: string }> = {
      'Crítica': { className: 'bg-red-700 text-white', label: 'Crítica' },
      'Alta': { className: 'bg-red-500 text-white', label: 'Alta' },
      'Media': { className: 'bg-yellow-300 text-black', label: 'Media' },
      'Baja': { className: 'bg-blue-300 text-black', label: 'Baja' },
    }
    const { className, label } = variants[prioridadNombre] || { className: '', label: prioridadNombre }
    if (!label) return null
    return <Badge className={className}>{label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {session.user?.nombre}
        </h1>
        <p className="text-muted-foreground">
          {session.user?.rol === 'ADMIN'
            ? 'Panel de administración del sistema de tickets'
            : isAgent
            ? 'Panel de control del sistema de tickets'
            : 'Consulta el estado de tus solicitudes de soporte'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {displayCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      {isAgent && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tickets por Estado - Pie Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Tickets por Estado</CardTitle>
              </div>
              <CardDescription>Distribución actual de tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tickets por Categoría - Bar Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Tickets por Categoría</CardTitle>
              </div>
              <CardDescription>Volumen de tickets por tipo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsPorCategoria} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis 
                      type="category" 
                      dataKey="categoria" 
                      width={150}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      fill="oklch(0.35 0.14 305)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tendencia de Tickets - Line Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Tendencia Semanal</CardTitle>
              </div>
              <CardDescription>Tickets abiertos vs resueltos por día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ticketsPorDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fecha" 
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('es', { weekday: 'short' })
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString('es', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'short' 
                        })
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="abiertos" 
                      stroke="oklch(0.50 0.20 330)"
                      strokeWidth={2}
                      dot={{ fill: 'oklch(0.50 0.20 330)' }}
                      name="Abiertos"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resueltos" 
                      stroke="oklch(0.60 0.15 145)"
                      strokeWidth={2}
                      dot={{ fill: 'oklch(0.60 0.15 145)' }}
                      name="Resueltos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mis Tickets - assigned to the agent/admin */}
      {!isUsuario && misTicketsPorEstado.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Mis Tickets</CardTitle>
            </div>
            <CardDescription>Tickets asignados a mí</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {misTicketsPorEstado.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold">{item.value}</p>
                  </div>
                  {getEstadoBadge(item.key)}
                </div>
              ))}
            </div>
            {misTicketsRecientes.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Mis tickets recientes</p>
                {misTicketsRecientes.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        #{ticket.id} - {ticket.titulo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.categoria?.Nombre ||
                          (ticket.categoria as any)?.nombre ||
                          categoriasCatalogo.find((c) => c.Id === ticket.categoria_id)?.Nombre ||
                          `Categoría #${ticket.categoria_id}`}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {getPrioridadBadge(ticket)}
                      {getEstadoBadge(ticket)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agentes - assigned tickets per agent/admin */}
      {isAgent && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Agentes</CardTitle>
            </div>
            <CardDescription>Tickets asignados por agente y administrador</CardDescription>
          </CardHeader>
          <CardContent>
            {agentesStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No hay agentes registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Agente</th>
                      <th className="pb-3 font-medium">Total</th>
                      <th className="pb-3 font-medium">Por estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentesStats.map((agente) => (
                      <tr key={agente.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <span className="font-medium">{agente.nombre}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-2xl font-bold">{agente.totalTickets}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {agente.porEstado.map((e) => (
                              <div key={e.estado} className="flex items-center gap-1">
                                {getEstadoBadge(e.estado)}
                                <span className="text-sm font-semibold">{e.count}</span>
                              </div>
                            ))}
                            {agente.porEstado.length === 0 && (
                              <span className="text-sm text-muted-foreground">Sin tickets asignados</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
