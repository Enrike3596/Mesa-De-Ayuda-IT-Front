'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  Calendar,
  MessageSquare,
  Send,
  CheckCheck,
  Loader2,
  UserPlus,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/lib/context/AuthContext'
import { ticketsStore, useTickets } from '@/lib/tickets-store'
import { useNotifications } from '@/lib/notifications-context'
import { obtenerUsuarios, type UsuarioResponse } from '@/lib/api/usuarioService'
import { listarCategorias } from '@/lib/api/categoriaService'
import { listarSubcategorias } from '@/lib/api/subcategoriaService'
import { listarPrioridades } from '@/lib/api/prioridadService'
import { obtenerAsignadosPorTicket, obtenerComentariosPorTicket, obtenerSlaPorTicket } from '@/lib/api/ticketService'
import { isTicketVencido, corregirSlaInfoResuelto } from '@/lib/utils'
import type { Ticket, TicketAsignado, TicketComentario, TicketEstado, TkAnexo, UpdateTicketForm, TicketSlaInfo, SolicitudCierrePayload, ConfirmacionCierrePayload } from '@/lib/types'
import { listarAnexosPorTicket, isImageFile, formatFileSize, getUrlArchivoCompleto } from '@/lib/api/anexoService'
import { subirAnexo, validarArchivo, EXTENSIONES_PERMITIDAS, MAX_FILE_SIZE } from '@/lib/api/anexoService'

interface TicketDetailProps {
  ticketId: number
}

const estadoOptions: { value: TicketEstado; label: string; color: string }[] = [
  { value: 'ABIERTO', label: 'Abierto', color: 'bg-accent text-accent-foreground' },
  { value: 'EN_PROCESO', label: 'En Proceso', color: 'bg-teal-500 text-white' },
  { value: 'EN_ESPERA', label: 'En espera', color: 'bg-yellow-500 text-black' },
  { value: 'PROGRAMADO', label: 'Programado', color: 'bg-blue-500 text-white' },
  { value: 'PENDIENTE_CONFIRMACION', label: 'Pendiente Confirmación', color: 'bg-purple-500 text-white' },
  { value: 'REABIERTO', label: 'Reabierto', color: 'bg-orange-500 text-white' },
  { value: 'CERRADO', label: 'Cerrado', color: 'bg-muted text-muted-foreground' },
  { value: 'RESUELTO', label: 'Resuelto', color: 'bg-green-600 text-white' },
]

const ESTADOS_MANUALES_AGENTE = estadoOptions.filter(
  (opt) => opt.value !== 'PENDIENTE_CONFIRMACION' && opt.value !== 'REABIERTO'
)

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const { session, isAgent, isAdmin } = useAuth()
  const canManageTicket = isAgent || isAdmin
  const { tickets } = useTickets()
  const { addNotification } = useNotifications()
  const [ticket, setTicket] = useState<Ticket | undefined>()
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [agents, setAgents] = useState<UsuarioResponse[]>([])
  const [pendingStatus, setPendingStatus] = useState<TicketEstado | ''>('')
  const [catalogUsers, setCatalogUsers] = useState<UsuarioResponse[]>([])
  const [catalogCategorias, setCatalogCategorias] = useState<any[]>([])
  const [catalogSubcategorias, setCatalogSubcategorias] = useState<any[]>([])
  const [catalogPrioridades, setCatalogPrioridades] = useState<any[]>([])
  const [selectedCategoria, setSelectedCategoria] = useState<string>('')
  const [selectedSubcategoria, setSelectedSubcategoria] = useState<string>('')
  const [fallbackComentarios, setFallbackComentarios] = useState<TicketComentario[]>([])
  const [fallbackAsignado, setFallbackAsignado] = useState<TicketAsignado | undefined>()
  const [anexos, setAnexos] = useState<TkAnexo[]>([])
  const [uploadingAnexos, setUploadingAnexos] = useState(false)
  const [anexoError, setAnexoError] = useState<string | null>(null)
  const [slaInfo, setSlaInfo] = useState<TicketSlaInfo | null>(null)
  const [solicitandoCierre, setSolicitandoCierre] = useState(false)
  const [resumenSolucion, setResumenSolucion] = useState('')
  const [confirmandoCierre, setConfirmandoCierre] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  useEffect(() => {
    const found = tickets.find(t => t.id === ticketId)
    setTicket(found)
    setPendingStatus(found?.estado || '')
    setSelectedCategoria(found?.categoria_id?.toString() || '')
    setSelectedSubcategoria(found?.subcategoria_id?.toString() || '')
  }, [tickets, ticketId])

  useEffect(() => {
    let mounted = true

    const loadAgents = async () => {
      if (!canManageTicket) return
      try {
        const data = await obtenerUsuarios()
        if (!mounted) return
        setAgents(Array.isArray(data) ? data : [])
      } catch {
        if (!mounted) return
        setAgents([])
      }
    }

    loadAgents()
    return () => {
      mounted = false
    }
  }, [canManageTicket])

  useEffect(() => {
    let mounted = true

    const loadCatalogData = async () => {
      try {
      const [usersData, categoriasData, subcategoriasData, prioridadesData] = await Promise.all([
        obtenerUsuarios(),
        listarCategorias(),
        listarSubcategorias(),
        listarPrioridades(),
      ])

      if (!mounted) return
      setCatalogUsers(Array.isArray(usersData) ? usersData : [])
      setCatalogCategorias(Array.isArray(categoriasData) ? categoriasData : [])
      setCatalogSubcategorias(Array.isArray(subcategoriasData) ? subcategoriasData : [])
      setCatalogPrioridades(Array.isArray(prioridadesData) ? prioridadesData : [])
      } catch {
        if (!mounted) return
        setCatalogUsers([])
        setCatalogCategorias([])
        setCatalogSubcategorias([])
        setCatalogPrioridades([])
      }
    }

    loadCatalogData()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const loadTicketRelated = async () => {
      if (!ticketId) return
      try {
        const [asignados, comentarios, anexosData] = await Promise.all([
          obtenerAsignadosPorTicket(ticketId),
          obtenerComentariosPorTicket(ticketId),
          listarAnexosPorTicket(ticketId),
        ])
        if (!mounted) return
        setFallbackAsignado(asignados.length > 0 ? asignados[asignados.length - 1] : undefined)
        setFallbackComentarios(comentarios)
        setAnexos(anexosData)
      } catch {
        if (!mounted) return
        setFallbackAsignado(undefined)
        setFallbackComentarios([])
      }
    }

    loadTicketRelated()
    return () => {
      mounted = false
    }
  }, [ticketId, ticket?.asignado?.agente_id, ticket?.comentarios?.length])

  const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024)

  const handleAttachFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const userId = session.user?.id
    const list = Array.from(e.target.files ?? [])
    e.target.value = ''

    console.log('[handleAttachFiles] ticketId:', ticketId, 'userId:', userId, 'files:', list.length)

    if (!ticketId || !userId || list.length === 0) {
      console.warn('[handleAttachFiles] retorno temprano:', { ticketId, userId, filesLength: list.length })
      return
    }
    if (ticket?.estado === 'CERRADO') {
      toast.error('No se pueden adjuntar archivos a un ticket cerrado')
      return
    }

    for (const file of list) {
      const error = validarArchivo(file)
      if (error) {
        setAnexoError(error)
        return
      }
    }

    setAnexoError(null)
    setUploadingAnexos(true)
    try {
      const created = await Promise.all(list.map((file) => subirAnexo(file, ticketId, userId)))
      console.log('[handleAttachFiles] Resultado subirAnexo:', created)

      const anexoKey = (a: TkAnexo) =>
        a.Id > 0
          ? `id:${a.Id}`
          : `tmp:${a.NombreArchivo}-${a.TamanoArchivo}-${a.UrlArchivo}-${a.FechaCarga}`

      // Optimistic update (and keep it even if the listing endpoint is delayed).
      setAnexos((prev) => {
        console.log('[handleAttachFiles] Optimistic update, prev:', prev.length, 'created:', created.length)
        const next = [...created, ...prev]
        const seen = new Set<string>()
        return next.filter((a) => {
          const k = anexoKey(a)
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
      })

      const anexosFresh = await listarAnexosPorTicket(ticketId)
      console.log('[handleAttachFiles] Fresh list:', anexosFresh)
      // Merge (do not replace) so we don't lose optimistic items when the backend
      // hasn't indexed/returned the new rows yet.
      setAnexos((prev) => {
        const next = [...anexosFresh, ...prev]
        const seen = new Set<string>()
        return next.filter((a) => {
          const k = anexoKey(a)
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
      })
      toast.success('Archivos adjuntados')
    } catch (err) {
      console.error('[handleAttachFiles] Error:', err)
      toast.error('No se pudieron adjuntar los archivos')
    } finally {
      setUploadingAnexos(false)
    }
  }

  useEffect(() => {
    let mounted = true
    const loadSla = async () => {
      if (!ticketId) return
      const info = await obtenerSlaPorTicket(ticketId)
      if (!mounted) return
      setSlaInfo(info)
    }
    loadSla().catch(() => {
      if (!mounted) return
      setSlaInfo(null)
    })
    return () => {
      mounted = false
    }
  }, [ticketId, ticket?.estado])

  const slaInfoCorregido = useMemo(
    () => corregirSlaInfoResuelto(ticket ?? ({} as Ticket), slaInfo),
    [ticket, slaInfo]
  )

  const availableAgents = useMemo(() => {
    if (!ticket) return []
    return agents.filter(a => {
      const userId = (a.id ?? (a as any).Id ?? 0) as number
      const roleRaw = a.rol ?? (a as any).Rol ?? ''
      const roleStr = roleRaw != null ? String(roleRaw).trim() : ''
      const upper = roleStr.toUpperCase()

      if (upper === 'ADMIN' || upper === 'AGENTE_TI') {
        return userId > 0
      }

      const simplified = roleStr
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s-]+/g, '_')

      const isAdminOrAgent =
        simplified === 'administrador' ||
        simplified === 'admin' ||
        simplified.includes('agente') ||
        simplified.includes('soporte')

      return isAdminOrAgent && userId > 0
    })
  }, [agents])

  const filteredSubcategorias = useMemo(() => {
    const catId = Number.parseInt(selectedCategoria, 10)
    if (!catId || !catalogSubcategorias.length) return []
    return catalogSubcategorias.filter((s) => {
      const sCatId = s.CategoriaId ?? s.categoriaId ?? s.categoria_id
      return sCatId === catId
    })
  }, [selectedCategoria, catalogSubcategorias])

  const userMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const u of catalogUsers) {
      const id = u.id ?? u.Id ?? 0
      const name = u.nombre ?? u.Nombre ?? ''
      if (id > 0 && name) map.set(id, name)
    }
    return map
  }, [catalogUsers])

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold">Ticket no encontrado</h2>
        <p className="mt-2 text-muted-foreground">El ticket #{ticketId} no existe</p>
        <Button asChild className="mt-4">
          <Link href="/tickets">Volver a tickets</Link>
        </Button>
      </div>
    )
  }

  const handleSaveChanges = async () => {
    if (!ticket) return
    if (ticket.estado === 'CERRADO') {
      toast.error('No se pueden modificar tickets cerrados')
      return
    }
    if (!session.user?.id) {
      toast.error('No se pudo identificar el usuario autenticado')
      return
    }

    const estadoCambio = pendingStatus && pendingStatus !== ticket.estado
    const comentarioTexto = comment.trim()
    const esCierreAgente = estadoCambio && pendingStatus === 'CERRADO' && canManageTicket
    const categoriaCambio = selectedCategoria && Number.parseInt(selectedCategoria, 10) !== ticket.categoria_id
    const subcategoriaCambio = selectedSubcategoria && Number.parseInt(selectedSubcategoria, 10) !== ticket.subcategoria_id

    if (estadoCambio && !comentarioTexto) {
      toast.error('Para cambiar el estado debes dejar un comentario')
      return
    }

    if (!estadoCambio && !selectedAgent && !comentarioTexto && !categoriaCambio && !subcategoriaCambio) {
      toast.error('No hay cambios para guardar')
      return
    }

    setSubmitting(true)
    try {
      if (comentarioTexto) {
        await ticketsStore.addComment(ticket.id, {
          comentario: comentarioTexto,
          es_interno: isInternal,
          usuario_id: session.user?.id,
        })
      }

      const solicitarCierre =
        esCierreAgente && ticket.estado !== 'REABIERTO'

      if (solicitarCierre) {
        if (ticket.estado === 'PROGRAMADO') {
          const progUpdates: UpdateTicketForm = {
            categoria_id: ticket.categoria_id,
            subcategoria_id: ticket.subcategoria_id,
            prioridad_id: ticket.prioridad_id,
            area_id: ticket.area_id,
            estado: 'EN_PROCESO',
          }
          await ticketsStore.updateTicket(ticket.id, progUpdates)
        }
        await ticketsStore.solicitarCierre(ticket.id, { ResumenSolucion: comentarioTexto })
      }

      const needsTicketUpdate =
        (!solicitarCierre && estadoCambio) ||
        categoriaCambio ||
        subcategoriaCambio

      if (needsTicketUpdate) {
        const updates: UpdateTicketForm = {
          categoria_id: ticket.categoria_id,
          subcategoria_id: ticket.subcategoria_id,
          prioridad_id: ticket.prioridad_id,
          area_id: ticket.area_id,
        }
        if (estadoCambio) updates.estado = pendingStatus as TicketEstado
        if (categoriaCambio) updates.categoria_id = Number.parseInt(selectedCategoria, 10)
        if (subcategoriaCambio) updates.subcategoria_id = Number.parseInt(selectedSubcategoria, 10)
        await ticketsStore.updateTicket(ticket.id, updates)
      }

      if (selectedAgent) {
        const agenteId = Number.parseInt(selectedAgent, 10)
        if (Number.isFinite(agenteId)) {
          await ticketsStore.assignTicket(ticket.id, agenteId)
        }
      }

      const [asignadosActualizados, comentariosActualizados] = await Promise.all([
        obtenerAsignadosPorTicket(ticket.id),
        obtenerComentariosPorTicket(ticket.id),
      ])
      setFallbackAsignado(asignadosActualizados.length > 0 ? asignadosActualizados[asignadosActualizados.length - 1] : undefined)
      setFallbackComentarios(comentariosActualizados)

      addNotification({
        tipo: 'TICKET_ACTUALIZADO',
        mensaje: `Cambios guardados en ticket #${ticket.id}`,
        ticket_id: ticket.id,
        leida: false,
      })

      setComment('')
      setIsInternal(false)
      setSelectedAgent('')
      toast.success('Cambios guardados correctamente')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'No se pudieron guardar los cambios'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    if (!session.user?.id) {
      toast.error('No se pudo identificar el usuario autenticado')
      return
    }

    setSubmitting(true)

    try {
      await ticketsStore.addComment(ticket.id, {
        comentario: comment,
        es_interno: isInternal,
        usuario_id: session.user?.id,
      })

      const comentariosActualizados = await obtenerComentariosPorTicket(ticket.id)
      setFallbackComentarios(comentariosActualizados)

      addNotification({
        tipo: 'COMENTARIO_NUEVO',
        mensaje: `Nuevo comentario en ticket #${ticket.id}`,
        ticket_id: ticket.id,
        leida: false,
      })

      toast.success('Comentario agregado')
      setComment('')
      setIsInternal(false)
    } catch {
      toast.error('No se pudo agregar el comentario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSolicitarCierre = async () => {
    if (!ticket || !resumenSolucion.trim()) return
    setSolicitandoCierre(true)
    try {
      const dto: SolicitudCierrePayload = { ResumenSolucion: resumenSolucion.trim() }
      await ticketsStore.solicitarCierre(ticket.id, dto)
      toast.success('Cierre solicitado. El usuario deberá confirmarlo.')
      setResumenSolucion('')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al solicitar cierre'
      toast.error(msg)
    } finally {
      setSolicitandoCierre(false)
    }
  }

  const handleConfirmarCierre = async (aceptado: boolean) => {
    if (!ticket) return
    if (!aceptado && !motivoRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo')
      return
    }
    setConfirmandoCierre(true)
    try {
      const dto: ConfirmacionCierrePayload = {
        Aceptado: aceptado,
        MotivoRechazo: aceptado ? undefined : motivoRechazo.trim(),
      }
      await ticketsStore.confirmarCierre(ticket.id, dto)
      toast.success(aceptado ? 'Ticket cerrado exitosamente.' : 'Cierre rechazado. Ticket reabierto.')
      setMotivoRechazo('')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al confirmar cierre'
      toast.error(msg)
    } finally {
      setConfirmandoCierre(false)
    }
  }

  const getEstadoBadge = (estado: TicketEstado, slaEstado?: string | null) => {
    const normalizedSlaEstado = String(slaEstado ?? '')
      .trim()
      .toUpperCase()
      .replace(/-/g, '_')
      .replace(/\s+/g, '_')

    if (estado === 'CERRADO' && normalizedSlaEstado === 'RESUELTO_VENCIDO') {
      return <Badge className="bg-red-600 text-white">Cerrado Vencido</Badge>
    }
    const config = estadoOptions.find((e) => e.value === estado)
    return (
      <Badge className={config?.color || 'bg-muted text-muted-foreground'}>
        {config?.label || estado || 'Desconocido'}
      </Badge>
    )
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Filter comments based on role - only agents can see internal comments
  const commentsSource = ticket.comentarios && ticket.comentarios.length > 0 ? ticket.comentarios : fallbackComentarios

  const visibleComments = commentsSource?.filter(c => {
    if (canManageTicket) return true
    return !c.es_interno
  }) || []

  const asignadoActual = ticket.asignado ?? fallbackAsignado

  const creatorName =
    ticket.usuario?.Nombre ||
    (ticket.usuario as any)?.nombre ||
    catalogUsers.find((u) => (u.id ?? (u as any).Id) === ticket.usuario_id)?.nombre ||
    catalogUsers.find((u) => (u.id ?? (u as any).Id) === ticket.usuario_id)?.Nombre ||
    'N/A'

  const categoriaNombre =
    ticket.categoria?.Nombre ||
    (ticket.categoria as any)?.nombre ||
    catalogCategorias.find((c) => (c.Id ?? c.id) === ticket.categoria_id)?.Nombre ||
    catalogCategorias.find((c) => (c.Id ?? c.id) === ticket.categoria_id)?.nombre ||
    'N/A'

  const subcategoriaNombre =
    ticket.subcategoria?.NombreSubcategoria ||
    (ticket.subcategoria as any)?.nombreSubcategoria ||
    (ticket.subcategoria as any)?.nombre ||
    catalogSubcategorias.find((s) => (s.Id ?? s.id) === ticket.subcategoria_id)?.NombreSubcategoria ||
    catalogSubcategorias.find((s) => (s.Id ?? s.id) === ticket.subcategoria_id)?.nombreSubcategoria ||
    catalogSubcategorias.find((s) => (s.Id ?? s.id) === ticket.subcategoria_id)?.nombre ||
    'N/A'

  const prioridadNombre =
    ticket.prioridad?.Nombre ||
    (ticket.prioridad as any)?.nombre ||
    catalogPrioridades.find((p) => (p.Id ?? p.id) === ticket.prioridad_id)?.Nombre ||
    catalogPrioridades.find((p) => (p.Id ?? p.id) === ticket.prioridad_id)?.nombre ||
    'N/A'

  const prioridadSla =
    ticket.prioridad?.Hora_sla ??
    (ticket.prioridad as any)?.hora_sla ??
    catalogPrioridades.find((p) => (p.Id ?? p.id) === ticket.prioridad_id)?.Hora_sla ??
    catalogPrioridades.find((p) => (p.Id ?? p.id) === ticket.prioridad_id)?.hora_sla ??
    null

  const fechaCierre =
    ticket.fecha_resolucion || (ticket.estado === 'CERRADO' ? ticket.updated_at : '')

  const resolveUserNameById = (userId?: number) => {
    if (!userId) return ''
    return (
      catalogUsers.find((u) => (u.id ?? (u as any).Id) === userId)?.nombre ||
      catalogUsers.find((u) => (u.id ?? (u as any).Id) === userId)?.Nombre ||
      ''
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/tickets">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Volver</span>
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                Ticket #{ticket.id}
              </h1>
              {getEstadoBadge(ticket.estado, slaInfoCorregido?.estado_sla ?? ticket.estado_sla)}
              {getPrioridadBadge(prioridadNombre)}
              {slaInfoCorregido?.estado_sla === 'Vencido' && (
                <Badge className="bg-red-600 text-white animate-pulse">Ticket Vencido</Badge>
              )}
              {canManageTicket && slaInfoCorregido?.estado_sla === 'Pausado' && (
                <Badge className="bg-yellow-500 text-black">Ticket Pausado</Badge>
              )}
            </div>
            <h2 className="mt-1 text-lg text-muted-foreground">{ticket.titulo}</h2>
          </div>
        </div>

        {/* Status selector for agents (hidden for closed tickets) */}
        {canManageTicket && ticket.estado !== 'CERRADO' && (
          <div className="flex items-center gap-2">
            <Label htmlFor="status" className="text-sm">Estado:</Label>
            <Select
              value={pendingStatus || ticket.estado}
              onValueChange={(value) => setPendingStatus(value as TicketEstado)}
            >
              <SelectTrigger id="status" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_MANUALES_AGENTE.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">{ticket.descripcion}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comentarios ({visibleComments.length})
              </CardTitle>
              <CardDescription>
                Historial de comunicación del ticket
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibleComments.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">
                  No hay comentarios aún
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleComments.map((comment) => {
                    const commentAuthorName =
                      comment.usuario?.Nombre ||
                      (comment.usuario as any)?.nombre ||
                      resolveUserNameById(comment.usuario_id) ||
                      `Usuario #${comment.usuario_id || 0}`

                    const isOwn = comment.usuario_id === session.user?.id

                    return (
                      <div
                        key={comment.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[85%]`}>
                          {/* Header with avatar */}
                          <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                                {getInitials(commentAuthorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-medium leading-none">{commentAuthorName}</span>
                              {comment.es_interno && (
                                <Lock className="h-3 w-3 text-yellow-500" />
                              )}
                              <time className="text-[10px] text-muted-foreground">
                                {comment.created_at && !isNaN(new Date(comment.created_at).getTime())
                                  ? formatDistanceToNow(new Date(comment.created_at), {
                                      addSuffix: true,
                                      locale: es,
                                    })
                                  : ''}
                              </time>
                            </div>
                          </div>
                          {/* Bubble */}
                          <div
                            className={`mt-1 whitespace-pre-wrap text-sm px-4 py-2.5 ${
                              isOwn
                                ? 'rounded-2xl rounded-tr-sm bg-primary text-primary-foreground'
                                : 'rounded-2xl rounded-tl-sm bg-muted'
                            } ${
                              comment.es_interno
                                ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-background'
                                : ''
                            }`}
                          >
                            {comment.comentario}
                          </div>
                          {/* Footer */}
                          {isOwn && (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <CheckCheck className="h-3 w-3" />
                              Enviado
                            </div>
                          )}
                          {comment.es_interno && !isOwn && (
                            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Lock className="h-3 w-3 text-yellow-500" />
                              <span>Interno</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <Separator className="my-4" />

              {/* Approve/reject for end user when pending confirmation */}
              {ticket.estado === 'PENDIENTE_CONFIRMACION' && !canManageTicket && (
                <div className="space-y-4">
                  <div className="rounded-md border border-purple-500/30 bg-purple-500/10 p-3">
                    <p className="text-sm font-medium text-purple-700">
                      El agente ha solicitado el cierre de este ticket.
                    </p>
                    <p className="mt-1 text-xs text-purple-600">
                      Confirma si el problema fue resuelto.
                    </p>
                    {ticket.fecha_solicitud_cierre && (
                      <p className="mt-1 text-xs text-purple-500">
                        Solicitado el {format(new Date(ticket.fecha_solicitud_cierre), 'PPp', { locale: es })}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment">Comentario (obligatorio para rechazar)</Label>
                    <Textarea
                      id="comment"
                      placeholder="Escriba su comentario..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      disabled={submitting || confirmandoCierre}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleConfirmarCierre(true)}
                      disabled={confirmandoCierre}
                      className="flex-1"
                    >
                      {confirmandoCierre ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Aceptar Cierre
                    </Button>
                    <Button
                      onClick={async () => {
                        const texto = comment.trim()
                        if (!texto) {
                          toast.error('Debes escribir un comentario explicando el motivo del rechazo')
                          return
                        }
                        setConfirmandoCierre(true)
                        try {
                          await ticketsStore.addComment(ticket.id, {
                            comentario: texto,
                            es_interno: false,
                            usuario_id: session.user?.id,
                          })
                          await ticketsStore.confirmarCierre(ticket.id, {
                            Aceptado: false,
                            MotivoRechazo: texto,
                          })
                          setMotivoRechazo('')
                          setComment('')
                          toast.success('Cierre rechazado. Ticket reabierto.')
                        } catch (err: any) {
                          const msg = err?.response?.data?.message || err?.message || 'Error al rechazar cierre'
                          toast.error(msg)
                        } finally {
                          setConfirmandoCierre(false)
                        }
                      }}
                      disabled={confirmandoCierre}
                      variant="destructive"
                      className="flex-1"
                    >
                      {confirmandoCierre ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Rechazar
                    </Button>
                  </div>
                </div>
              )}

              {/* Ticket cerrado: no se permiten comentarios */}
              {ticket.estado === 'CERRADO' ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Ticket cerrado. No se pueden agregar más comentarios ni realizar cambios.
                </p>
              ) : (
                <>
                  {/* Normal comment form (for non-pending-confirmation or for agents) */}
                  {ticket.estado !== 'PENDIENTE_CONFIRMACION' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!canManageTicket) {
                          handleAddComment(e)
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="comment">Agregar comentario</Label>
                        <Textarea
                          id="comment"
                          placeholder="Escriba su comentario..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={3}
                          disabled={submitting}
                        />
                      </div>

                      {isAgent && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="internal"
                            checked={isInternal}
                            onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                            disabled={submitting}
                          />
                          <Label htmlFor="internal" className="flex items-center gap-1 text-sm">
                            <Lock className="h-3 w-3" />
                            Comentario interno.
                          </Label>
                        </div>
                      )}

                      {!canManageTicket && (
                        <Button type="submit" disabled={!comment.trim() || submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar comentario
                              </>
                          )}
                        </Button>
                      )}
                    </form>
                  )}

                  {canManageTicket && (
                    <Button onClick={handleSaveChanges} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar cambios'
                      )}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Creado por</p>
                  <p className="font-medium">{creatorName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Categoría</p>
                  {canManageTicket && ticket.estado !== 'CERRADO' ? (
                    <Select
                      value={selectedCategoria}
                      onValueChange={(val) => {
                        setSelectedCategoria(val)
                        setSelectedSubcategoria('')
                      }}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogCategorias.map((cat) => {
                          const catId = (cat.Id ?? cat.id ?? 0).toString()
                          const catName = cat.Nombre ?? cat.nombre ?? ''
                          return (
                            <SelectItem key={catId} value={catId}>
                              {catName}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{categoriaNombre}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Subcategoría</p>
                  {canManageTicket && ticket.estado !== 'CERRADO' ? (
                    <Select
                      value={selectedSubcategoria}
                      onValueChange={setSelectedSubcategoria}
                      disabled={!selectedCategoria}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue placeholder={selectedCategoria ? 'Seleccionar subcategoría' : 'Seleccione categoría primero'} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubcategorias.map((sub) => {
                          const subId = (sub.Id ?? sub.id ?? 0).toString()
                          const subName = sub.NombreSubcategoria ?? sub.nombreSubcategoria ?? sub.Nombre ?? sub.nombre ?? ''
                          return (
                            <SelectItem key={subId} value={subId}>
                              {subName}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium">{subcategoriaNombre}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de creación</p>
                  <p className="font-medium">
                    {ticket.created_at && !isNaN(new Date(ticket.created_at).getTime())
                      ? format(new Date(ticket.created_at), 'PPp', { locale: es })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de cierre</p>
                  <p className="font-medium">
                    {fechaCierre && !isNaN(new Date(fechaCierre).getTime())
                      ? format(new Date(fechaCierre), 'PPp', { locale: es })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {ticket.fecha_solicitud_cierre && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Solicitud de cierre</p>
                    <p className="font-medium">
                      {format(new Date(ticket.fecha_solicitud_cierre), 'PPp', { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              {ticket.fecha_confirmacion_cierre && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Confirmación de cierre</p>
                    <p className="font-medium">
                      {format(new Date(ticket.fecha_confirmacion_cierre), 'PPp', { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              {ticket.motivo_rechazo && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Motivo de rechazo</p>
                    <p className="font-medium text-orange-500">{ticket.motivo_rechazo}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Responsable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asignadoActual ? (
                <div className="flex items-center gap-3 rounded-lg border p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                      {getInitials(
                        asignadoActual.agente?.Nombre ||
                        (asignadoActual.agente as any)?.nombre ||
                        resolveUserNameById(asignadoActual.agente_id) ||
                        ''
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {asignadoActual.agente?.Nombre ||
                        (asignadoActual.agente as any)?.nombre ||
                        resolveUserNameById(asignadoActual.agente_id) ||
                        `#${asignadoActual.agente_id || 0}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {asignadoActual.asignado_en && !isNaN(new Date(asignadoActual.asignado_en).getTime())
                        ? formatDistanceToNow(new Date(asignadoActual.asignado_en), {
                            addSuffix: true,
                            locale: es,
                          })
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin responsable asignado</p>
              )}

              {/* Reassign agent (agents/admins only, not for closed tickets) */}
              {canManageTicket && ticket.estado !== 'CERRADO' && availableAgents.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <Label>
                    {asignadoActual ? 'Reasignar responsable' : 'Asignar responsable'}
                  </Label>
                  <div className="flex gap-2">
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgents.map((agent) => {
                          const agentId = (agent.id ?? (agent as any).Id ?? 0) as number
                          const agentName = agent.nombre ?? (agent as any).Nombre ?? `#${agentId}`
                          return (
                          <SelectItem key={agentId} value={agentId.toString()}>
                            {agentName}
                          </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Al guardar se reemplazar&aacute; el responsable actual.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                SLA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Estado SLA badge */}
                {slaInfoCorregido?.estado_sla && (canManageTicket || slaInfoCorregido.estado_sla !== 'Pausado') && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Estado SLA</span>
                    <Badge className={
                      slaInfoCorregido.estado_sla === 'Vencido' || slaInfoCorregido.estado_sla === 'Resuelto Vencido'
                        ? 'bg-red-600 text-white'
                        : slaInfoCorregido.estado_sla === 'Pausado'
                        ? 'bg-yellow-500 text-black'
                        : slaInfoCorregido.estado_sla === 'En Tiempo'
                        ? 'bg-green-600 text-white'
                        : slaInfoCorregido.estado_sla === 'Resuelto En Tiempo'
                        ? 'bg-green-700 text-white'
                        : ''
                    }>
                      {slaInfoCorregido.estado_sla}
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiempo objetivo</span>
                  <span className="font-medium">{prioridadSla !== null ? `${prioridadSla}h` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha limite</span>
                  <span className="font-medium">
                    {slaInfoCorregido?.fecha_limite_sla && !isNaN(new Date(slaInfoCorregido.fecha_limite_sla).getTime())
                      ? format(new Date(slaInfoCorregido.fecha_limite_sla), 'PPp', { locale: es })
                      : 'No disponible'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prioridad</span>
                  {getPrioridadBadge(prioridadNombre)}
                </div>

                {/* Tiempo restante */}
                {slaInfoCorregido && slaInfoCorregido.estado_sla === 'En Tiempo' && slaInfoCorregido.minutos_restantes > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 p-2 text-sm text-green-700">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      {slaInfoCorregido.minutos_restantes >= 60
                        ? `${Math.floor(slaInfoCorregido.minutos_restantes / 60)}h ${slaInfoCorregido.minutos_restantes % 60}m restantes`
                        : `${slaInfoCorregido.minutos_restantes}m restantes`}
                    </span>
                  </div>
                )}

                {/* Vencido */}
                {slaInfoCorregido?.estado_sla === 'Vencido' && slaInfoCorregido?.sla_vencido && (
                  <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      {slaInfoCorregido.tiempo_vencido_mins > 0
                        ? `Vencido por ${slaInfoCorregido.tiempo_vencido_mins >= 60
                            ? `${Math.floor(slaInfoCorregido.tiempo_vencido_mins / 60)}h ${slaInfoCorregido.tiempo_vencido_mins % 60}m`
                            : `${slaInfoCorregido.tiempo_vencido_mins}m`}`
                        : 'Este ticket ha excedido el tiempo de resolución'}
                    </span>
                  </div>
                )}

                {/* Pausado */}
                {canManageTicket && slaInfoCorregido?.estado_sla === 'Pausado' && (
                  <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-sm text-yellow-700">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>SLA pausado - el tiempo se reanudará al volver a estado activo</span>
                  </div>
                )}

                {/* Resuelto */}
                {(slaInfoCorregido?.estado_sla === 'Resuelto En Tiempo' || slaInfoCorregido?.estado_sla === 'Resuelto Vencido') && (
                  <div className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
                    slaInfoCorregido.estado_sla === 'Resuelto Vencido'
                      ? 'border-red-500/30 bg-red-500/10 text-red-600'
                      : 'border-green-500/30 bg-green-500/10 text-green-700'
                  }`}>
                    {slaInfoCorregido.estado_sla === 'Resuelto Vencido' ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {slaInfoCorregido.estado_sla === 'Resuelto Vencido'
                        ? 'Resuelto fuera del tiempo SLA'
                        : 'Resuelto dentro del tiempo SLA'}
                    </span>
                  </div>
                )}

                {/* Sin SLA */}
                {(!slaInfoCorregido?.estado_sla && !slaInfoCorregido?.fecha_limite_sla) && (
                  <p className="text-sm text-muted-foreground">
                    Sin SLA definido para esta prioridad
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Archivos adjuntos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                Archivos adjuntos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.estado !== 'CERRADO' && (
                <div className="space-y-2 pb-4">
                  <Label htmlFor="adjuntar-archivos">Adjuntar archivos</Label>
                  <Input
                    id="adjuntar-archivos"
                    type="file"
                    multiple
                    accept={EXTENSIONES_PERMITIDAS.map(e => `.${e}`).join(',')}
                    onChange={handleAttachFiles}
                    disabled={uploadingAnexos}
                  />
                  {anexoError && <p className="text-sm text-destructive">{anexoError}</p>}
                  <p className="text-xs text-muted-foreground">
                    Formatos permitidos: {EXTENSIONES_PERMITIDAS.join(', ')}. Maximo {maxSizeMB}MB por archivo.
                  </p>
                  {uploadingAnexos && (
                    <p className="text-xs text-muted-foreground">Subiendo archivos...</p>
                  )}
                </div>
              )}

              {anexos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin archivos adjuntos</p>
              ) : (
                <ul className="space-y-2">
                  {anexos.map((anexo) => (
                    <li
                      key={
                        anexo.Id > 0
                          ? String(anexo.Id)
                          : `${anexo.NombreArchivo}-${anexo.FechaCarga}-${anexo.TamanoArchivo}-${anexo.UrlArchivo}`
                      }
                    >
                      <a
                        href={getUrlArchivoCompleto(anexo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/50"
                      >
                        {isImageFile(anexo) ? (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded">
                            <img
                              src={getUrlArchivoCompleto(anexo)}
                              alt={anexo.NombreArchivo}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                            <svg className="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{anexo.NombreArchivo}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(anexo.TamanoArchivo)}
                            {anexo.UsuarioId > 0 && (
                              <>
                                {' — '}
                                <span className="inline-flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {anexo.UsuarioId === session.user?.id ? 'Tú' : (userMap.get(anexo.UsuarioId) ?? `Usuario #${anexo.UsuarioId}`)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
