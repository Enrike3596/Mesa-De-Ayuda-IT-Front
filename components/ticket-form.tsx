'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Send, X, FileIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/context/AuthContext'
import { ticketsStore } from '@/lib/tickets-store'
import { useNotifications } from '@/lib/notifications-context'
import { listarCategorias } from '@/lib/api/categoriaService'
import { listarSubcategorias } from '@/lib/api/subcategoriaService'
import { listarPrioridades } from '@/lib/api/prioridadService'
import { listarAreas } from '@/lib/api/areaService'
import { listarTipoTickets } from '@/lib/api/tipoTicketService'
import { obtenerUsuariosPorArea } from '@/lib/api/usuarioService'
import type { UsuarioResponse } from '@/lib/api/usuarioService'

import type { Categoria, Subcategoria, CreateTicketForm, Prioridad, Area, TipoTicketInfo } from '@/lib/types'
import Link from 'next/link'
import { validarArchivo, EXTENSIONES_PERMITIDAS, MAX_FILE_SIZE } from '@/lib/api/anexoService'

export function TicketForm() {
  const router = useRouter()
  const { session } = useAuth()
  const { addNotification } = useNotifications()
  const [loading, setLoading] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [tipoTickets, setTipoTickets] = useState<TipoTicketInfo[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [usuariosPorArea, setUsuariosPorArea] = useState<UsuarioResponse[]>([])
  const [archivos, setArchivos] = useState<File[]>([])
  const [archivoError, setArchivoError] = useState<string | null>(null)

  const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const nuevos: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validarArchivo(file)
      if (error) {
        setArchivoError(error)
        return
      }
      nuevos.push(file)
    }

    setArchivoError(null)
    setArchivos(prev => [...prev, ...nuevos])
    e.target.value = ''
  }

  const removerArchivo = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index))
  }

  const [form, setForm] = useState<CreateTicketForm>({
    titulo: '',
    descripcion: '',
    tipo_ticket_id: 0,
    categoria_id: 0,
    subcategoria_id: null,
    prioridad_id: 0,
    usuario_id: 0,
    area_id: 0,
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
      const [tipos, cats, subs, prios, areasData] = await Promise.all([listarTipoTickets(), listarCategorias(), listarSubcategorias(), listarPrioridades(), listarAreas()])
      if (!mounted) return
      setTipoTickets(Array.isArray(tipos) ? tipos : [])
      setCategorias(Array.isArray(cats) ? cats : [])
      setSubcategorias(Array.isArray(subs) ? subs : [])
      setPrioridades(Array.isArray(prios) ? prios : [])
      setAreas(Array.isArray(areasData) ? areasData : [])
      } catch {
        if (!mounted) return
        setTipoTickets([])
        setCategorias([])
        setSubcategorias([])
        setPrioridades([])
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
    if (!form.area_id) {
      setUsuariosPorArea([])
      return
    }

    let mounted = true

    const load = async () => {
      try {
        const data = await obtenerUsuariosPorArea(form.area_id)
        if (!mounted) return
        setUsuariosPorArea(Array.isArray(data) ? data : [])
      } catch {
        if (!mounted) return
        setUsuariosPorArea([])
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [form.area_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const userId = session.user?.id;

    if (!form.titulo || !form.descripcion || !form.tipo_ticket_id || !form.categoria_id || !form.prioridad_id || !form.area_id || !userId) {
      toast.error('Información incompleta', {
        description: !userId ? 'No se pudo identificar al usuario. Reintente loguear.' : 'Por favor complete todos los campos obligatorios.'
      })
      return
    }

    setLoading(true)

    try {
      const isAdmin = session.user?.rol === 'ADMIN' || session.user?.rol === 'AGENTE_TI'
      const { ticket: newTicket, uploadErrors } = await ticketsStore.addTicket({
        ...form,
        usuario_id: isAdmin ? form.usuario_id || userId : userId
      }, archivos.length > 0 ? archivos : undefined)
      
      addNotification({
        tipo: 'TICKET_CREADO',
        mensaje: `Nuevo ticket #${newTicket.id}: ${newTicket.titulo}`,
        ticket_id: newTicket.id,
        leida: false,
      })

      if (uploadErrors > 0) {
        toast.warning('Ticket creado con advertencias', {
          description: `${uploadErrors} archivo(s) no se pudieron subir. Puede adjuntarlos desde la vista del ticket.`,
        })
      } else {
        toast.success('Ticket creado exitosamente', {
          description: `Ticket #${newTicket.id} ha sido registrado`,
        })
      }

      router.push(`/tickets/${newTicket.id}`)
    } catch {
      toast.error('No se pudo crear el ticket', {
        description: 'Verifique la conexión con el backend e intente nuevamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field: keyof CreateTicketForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tickets">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Volver</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Ticket</h1>
          <p className="text-muted-foreground">
            Complete el formulario para crear una nueva solicitud de soporte
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Información del Ticket</CardTitle>
          <CardDescription>
            Proporcione detalles sobre su problema o solicitud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Titulo */}
            <div className="space-y-2">
              <Label htmlFor="titulo">Título del ticket *</Label>
                <Input
                  id="titulo"
                  placeholder="Describa brevemente su problema"
                  value={form.titulo}
                  onChange={(e) => updateForm('titulo', e.target.value)}
                  disabled={loading}
                  maxLength={150}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 150 caracteres ({form.titulo.length}/150)
                </p>
              </div>

            {/* Descripcion */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción detallada *</Label>
              <Textarea
                id="descripcion"
                placeholder="Explique con detalle su problema o solicitud. Incluya cualquier información relevante como mensajes de error, pasos para reproducir el problema, etc."
                value={form.descripcion}
                onChange={(e) => updateForm('descripcion', e.target.value)}
                disabled={loading}
                rows={5}
              />
            </div>

            {/* Tipo de Ticket */}
            <div className="space-y-2">
              <Label htmlFor="tipo_ticket">Tipo de ticket *</Label>
              <Select
                value={form.tipo_ticket_id.toString() || ''}
                onValueChange={(value) => {
                  const tipoId = parseInt(value)
                  setForm(prev => ({ ...prev, tipo_ticket_id: tipoId, categoria_id: 0, subcategoria_id: null }))
                }}
                disabled={loading || loadingCatalog || tipoTickets.length === 0}
              >
                <SelectTrigger id="tipo_ticket">
                  <SelectValue placeholder="Seleccione tipo de ticket" />
                </SelectTrigger>
                <SelectContent>
                  {tipoTickets.map((tipo) => (
                    <SelectItem key={tipo.Id} value={tipo.Id.toString()}>
                      {tipo.Nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info de tipo de ticket */}
            {form.tipo_ticket_id > 0 ? (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 rounded-full bg-purple-100 p-1.5 dark:bg-purple-900/50">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                      {tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre?.charAt(0) ?? '?'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-purple-800 dark:text-purple-200">
                      {tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre === 'Incidente'
                        ? 'Has seleccionado un Incidente'
                        : tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre === 'Requerimiento'
                          ? 'Has seleccionado un Requerimiento'
                          : `Tipo seleccionado: ${tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre ?? ''}`
                      }
                    </p>
                    <p className="text-muted-foreground">
                      {tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre === 'Incidente'
                        ? 'Reporta un problema o error que impide realizar una tarea. El equipo de soporte trabajará para restaurar el servicio lo antes posible.'
                        : tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre === 'Requerimiento'
                          ? 'Solicita una nueva funcionalidad, cambio o mejora. El equipo evaluará la viabilidad y planificará su implementación.'
                          : 'Selecciona las categorías que mejor describan tu solicitud para una atención más rápida.'
                      }
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      {tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre === 'Incidente' && (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                            Ejemplos: Error en sistema, problema de red, fallo de hardware, acceso denegado
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                            Categorías comunes: Soporte técnico, Infraestructura, Seguridad
                          </li>
                        </>
                      )}
                      {tipoTickets.find(t => t.Id === form.tipo_ticket_id)?.Nombre === 'Requerimiento' && (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            Ejemplos: Nueva funcionalidad, actualización de software, permisos de acceso, mejora de proceso
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            Categorías comunes: Desarrollo, Mejora continua, Capacitación
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-muted bg-muted/30 p-4">
                <h4 className="mb-3 text-sm font-medium">¿Qué tipo de ticket necesitas?</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/20">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">Incidente</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reporta un problema o error que afecta tu trabajo. Ej: sistema caído, error inesperado, fallo de red.
                    </p>
                  </div>
                  <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Requerimiento</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solicita algo nuevo o un cambio. Ej: nueva funcionalidad, permiso de acceso, actualización, mejora.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Categoria, Subcategoria y Prioridad */}
            {/* Avoid cramped selects inside dialogs: 2 cols on sm, 3 cols only on lg+ */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={form.categoria_id.toString() || ''}
                  onValueChange={(value) => {
                    const catId = parseInt(value)
                    const isAdmin = session.user?.rol === 'ADMIN' || session.user?.rol === 'AGENTE_TI'
                     if (!isAdmin) {
                       const areaId = categorias.find(c => c.Id === catId)?.AreaId ?? 0
                      setForm(prev => ({ ...prev, categoria_id: catId, area_id: areaId, subcategoria_id: null }))
                     } else {
                      setForm(prev => ({ ...prev, categoria_id: catId, subcategoria_id: null }))
                     }
                   }}
                  disabled={loading || loadingCatalog || !form.tipo_ticket_id || categorias.filter(c => c.Estado && c.TipoTicketId === form.tipo_ticket_id).length === 0}
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.Estado && c.TipoTicketId === form.tipo_ticket_id).map((cat) => (
                      <SelectItem key={cat.Id} value={cat.Id.toString()}>
                        {cat.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.categoria_id > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {categorias.find(c => c.Id === form.categoria_id)?.Descripcion}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategoria">Subcategoría</Label>
                <Select
                  value={form.subcategoria_id ? form.subcategoria_id.toString() : ''}
                  onValueChange={(value) => {
                    const next = parseInt(value)
                    setForm(prev => ({ ...prev, subcategoria_id: Number.isFinite(next) && next > 0 ? next : null }))
                  }}
                  disabled={loading || loadingCatalog || form.categoria_id === 0 || subcategorias.filter(s => s.CategoriaId === form.categoria_id && s.Estado).length === 0}
                >
                  <SelectTrigger id="subcategoria">
                    <SelectValue placeholder="Seleccione una subcategoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategorias.filter(s => s.CategoriaId === form.categoria_id && s.Estado).map((sub) => (
                      <SelectItem key={sub.Id} value={sub.Id.toString()}>
                        {sub.NombreSubcategoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!!form.subcategoria_id && form.subcategoria_id > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {subcategorias.find(s => s.Id === form.subcategoria_id)?.Descripcion}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridad">Prioridad *</Label>
                <Select
                  value={form.prioridad_id.toString() || ''}
                  onValueChange={(value) => updateForm('prioridad_id', parseInt(value))}
                  disabled={loading || loadingCatalog || prioridades.length === 0}
                >
                  <SelectTrigger id="prioridad">
                    <SelectValue placeholder="Seleccione la prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {prioridades.filter(p => p.Estado).map((prio) => (
                      <SelectItem key={prio.Id} value={prio.Id.toString()}>
                        {prio.Nombre} (SLA: {prio.Hora_sla}h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.prioridad_id > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Tipo: {prioridades.find(p => p.Id === form.prioridad_id)?.Tipo}
                  </p>
                )}
              </div>
            </div>

            {/* Area y Usuario — solo ADMIN/AGENTE_TI */}
            {(session.user?.rol === 'ADMIN' || session.user?.rol === 'AGENTE_TI') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="area">Área *</Label>
                  <Select
                    value={form.area_id.toString() || ''}
                    onValueChange={(value) => {
                      const areaId = parseInt(value)
                      setForm(prev => ({ ...prev, area_id: areaId, usuario_id: 0 }))
                      setUsuariosPorArea([])
                    }}
                    disabled={loading || loadingCatalog || areas.length === 0}
                  >
                    <SelectTrigger id="area">
                      <SelectValue placeholder="Seleccione un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.filter(a => a.Estado).map((area) => (
                        <SelectItem key={area.Id} value={area.Id.toString()}>
                          {area.NombreArea}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuario solicitante *</Label>
                  <Select
                    value={form.usuario_id.toString() || ''}
                    onValueChange={(value) => setForm(prev => ({ ...prev, usuario_id: parseInt(value) }))}
                    disabled={loading || form.area_id === 0 || usuariosPorArea.length === 0}
                  >
                    <SelectTrigger id="usuario">
                      <SelectValue placeholder="Seleccione un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosPorArea.filter(u => {
                        const estado = u.estado ?? u.Estado
                        return estado === true || estado === 'true' || estado === 'Activo' || estado === 'activo' || estado === 1
                      }).map((usr) => {
                        const id = usr.id ?? usr.Id ?? 0
                        const nombre = usr.nombre ?? usr.Nombre ?? ''
                        return (
                          <SelectItem key={id} value={id.toString()}>
                            {nombre}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Archivos adjuntos */}
            <div className="space-y-2">
              <Label>Archivos adjuntos</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="archivos"
                  type="file"
                  multiple
                  accept={EXTENSIONES_PERMITIDAS.map(e => `.${e}`).join(',')}
                  onChange={handleFileChange}
                  disabled={loading}
                  className="flex-1"
                />
              </div>
              {archivoError && (
                <p className="text-sm text-destructive">{archivoError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: {EXTENSIONES_PERMITIDAS.join(', ')} &mdash; Máximo {maxSizeMB}MB por archivo
              </p>
              {archivos.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {archivos.map((file, index) => (
                    <li key={index} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => removerArchivo(index)}
                        disabled={loading}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Info */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium">Información importante</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Su ticket será revisado por nuestro equipo de soporte</li>
                <li>• Recibirá notificaciones sobre el progreso de su solicitud</li>
                <li>• El tiempo de respuesta depende de la prioridad seleccionada</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Crear Ticket
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild disabled={loading}>
                <Link href="/tickets">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
