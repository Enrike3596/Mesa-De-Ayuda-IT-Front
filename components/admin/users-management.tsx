'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Usuario } from '@/lib/types'
import type { Area, RoleName, Rol } from '@/lib/types'
import { listarAreas } from '@/lib/api/areaService'
import {
  obtenerUsuarios,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario,
} from '@/lib/api/usuarioService'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ROLE_OPTIONS: Array<{ id: number; nombre: RoleName; descripcion: string }> = [
  { id: 1, nombre: 'ADMIN', descripcion: 'Administrador del sistema' },
  { id: 2, nombre: 'AGENTE_TI', descripcion: 'Agente de soporte técnico' },
  { id: 3, nombre: 'USUARIO', descripcion: 'Usuario final' },
]

function normalizeRole(role: string | undefined | null): RoleName {
  if (!role) return 'USUARIO'
  const direct = role.trim().toUpperCase()
  if (direct === 'ADMIN' || direct === 'AGENTE_TI' || direct === 'USUARIO') return direct

  const simplified = role
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')

  if (simplified === 'administrador' || simplified === 'admin') return 'ADMIN'
  if (simplified.includes('agente') || simplified.includes('soporte')) return 'AGENTE_TI'
  return 'USUARIO'
}

function extractApiErrorMessage(error: any): string {
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  const title = data?.title || data?.message
  const errors = data?.errors
  if (errors && typeof errors === 'object') {
    const firstKey = Object.keys(errors)[0]
    const firstError = firstKey ? errors[firstKey]?.[0] : undefined
    if (firstError) return firstError
  }
  if (title) return title
  return 'Error de validacion en el backend'
}

function pickFirst<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

export function UsersManagement() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<number | null>(null)
  const [areaFilter, setAreaFilter] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    RolId: 0,
    AreaId: 0,
    Nombre: '',
    Correo: '',
    Telefono: '',
    ContrasenaHash: '',
    Estado: true,
    FechaCreacion: '',
    FechaModificacion: '',
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const [areasData, usersData] = await Promise.all([listarAreas(), obtenerUsuarios()])
        if (!mounted) return

        const safeAreas: Area[] = (Array.isArray(areasData) ? areasData : []).map((a: any) => ({
          Id: a.Id ?? a.id,
          NombreArea: a.NombreArea ?? a.nombreArea ?? a.nombre ?? '',
          Estado: a.Estado ?? a.estado ?? true,
        }))
        setAreas(safeAreas)

        const mapped: Usuario[] = (Array.isArray(usersData) ? usersData : []).map((u: any) => {
          const roleRaw = pickFirst(u?.rol, u?.Rol, u?.rolNombre, u?.RolNombre)
          const roleName = normalizeRole(roleRaw)
          const rolId =
            pickFirst(u?.RolId, u?.rolId, u?.rol_id) ??
            ROLE_OPTIONS.find((r) => r.nombre === roleName)?.id ??
            3

          const areaRaw = pickFirst(u?.area, u?.Area)
          const areaObjFromApi =
            areaRaw && typeof areaRaw === 'object'
              ? {
                  Id: pickFirst(areaRaw?.Id, areaRaw?.id, areaRaw?.areaId, areaRaw?.area_id, 0) || 0,
                  NombreArea:
                    pickFirst(
                      areaRaw?.NombreArea,
                      areaRaw?.nombreArea,
                      areaRaw?.nombre_area,
                      areaRaw?.Nombre,
                      areaRaw?.nombre,
                      ''
                    ) || '',
                  Estado: Boolean(pickFirst(areaRaw?.Estado, areaRaw?.estado, true)),
                }
              : undefined

          const areaName =
            typeof areaRaw === 'string'
              ? areaRaw.trim()
              : areaObjFromApi?.NombreArea?.trim() || ''

          const areaIdFromApi =
            pickFirst(u?.AreaId, u?.areaId, u?.area_id, areaObjFromApi?.Id, 0) || 0
          const areaById = areaIdFromApi ? safeAreas.find((a) => a.Id === areaIdFromApi) : undefined
          const areaByName = areaName
            ? safeAreas.find((a) => a.NombreArea.toLowerCase() === areaName.toLowerCase())
            : undefined

          const areaObj: Area | undefined =
            areaById ??
            areaByName ??
            (areaObjFromApi?.NombreArea
              ? areaObjFromApi
              : areaName
                ? { Id: areaIdFromApi || 0, NombreArea: areaName, Estado: true }
                : undefined)

          const fechaCreacion =
            pickFirst(
              u?.FechaCreacion,
              u?.fechaCreacion,
              u?.fecha_creacion,
              u?.CreatedAt,
              u?.createdAt,
              u?.created_at,
              ''
            ) || ''
          const fechaModificacion =
            pickFirst(
              u?.FechaModificacion,
              u?.fechaModificacion,
              u?.fecha_modificacion,
              u?.UpdatedAt,
              u?.updatedAt,
              u?.updated_at,
              ''
            ) || ''

          return {
            Id: pickFirst(u?.Id, u?.id, 0) || 0,
            Nombre: pickFirst(u?.Nombre, u?.nombre, '') || '',
            Correo: pickFirst(u?.Correo, u?.correo, '') || '',
            Telefono: pickFirst(u?.Telefono, u?.telefono, '') || '',
            Estado:
              String(pickFirst(u?.Estado, u?.estado, false)).toLowerCase() === 'true' ||
              String(pickFirst(u?.Estado, u?.estado, false)).toLowerCase() === 'activo',
            RolId: rolId,
            AreaId: areaObj?.Id ?? areaIdFromApi ?? 0,
            ContrasenaHash: '',
            FechaCreacion: fechaCreacion,
            FechaModificacion: fechaModificacion,
            rol: { id: rolId, nombre: roleName, descripcion: roleName } as Rol,
            area: areaObj,
          }
        })

        setUsuarios(mapped)
      } catch {
        if (!mounted) return
        setAreas([])
        setUsuarios([])
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return usuarios.filter((u) => {
      const matchSearch = u.Nombre.toLowerCase().includes(q) || u.Correo.toLowerCase().includes(q)
      const matchRole = roleFilter ? u.RolId === roleFilter : true
      const matchArea = areaFilter ? u.AreaId === areaFilter : true
      return matchSearch && matchRole && matchArea
    })
  }, [usuarios, searchQuery, roleFilter, areaFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter(null)
    setAreaFilter(null)
  }

  const hasActiveFilters = searchQuery || roleFilter || areaFilter

  const getRoleBadge = (rolNombre: string) => {
    const config: Record<string, { className: string; label: string }> = {
      ADMIN: { className: 'bg-primary text-primary-foreground', label: 'Administrador' },
      AGENTE_TI: { className: 'bg-secondary text-secondary-foreground', label: 'Agente TI' },
      USUARIO: { className: 'bg-muted text-muted-foreground', label: 'Usuario' },
    }
    const { className, label } = config[rolNombre] || { className: '', label: rolNombre }
    return <Badge className={className}>{label}</Badge>
  }

  const handleOpenDialog = (user?: Usuario) => {
    if (user) {
      const fallbackAreaId = user.AreaId || user.area?.Id || 0
      setEditingUser(user)
      setFormData({
        RolId: user.RolId,
        AreaId: fallbackAreaId,
        Nombre: user.Nombre,
        Correo: user.Correo,
        Telefono: user.Telefono,
        ContrasenaHash: '',
        Estado: user.Estado,
        FechaCreacion: user.FechaCreacion,
        FechaModificacion: user.FechaModificacion,
      })
    } else {
      setEditingUser(null)
      setFormData({
        RolId: 0,
        AreaId: 0,
        Nombre: '',
        Correo: '',
        Telefono: '',
        ContrasenaHash: '',
        Estado: true,
        FechaCreacion: '',
        FechaModificacion: '',
      })
    }
    setTimeout(() => setDialogOpen(true), 0)
  }

  const handleSave = () => {
    const nombre = formData.Nombre.trim()
    const correo = formData.Correo.trim()
    const telefono = formData.Telefono.trim()
    const contrasena = formData.ContrasenaHash.trim()

    if (
      !nombre ||
      !correo ||
      !telefono ||
      !formData.RolId ||
      !formData.AreaId
    ) {
      toast.error('Complete todos los campos')
      return
    }

    if (nombre.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    if (correo.length < 5 || !correo.includes('@')) {
      toast.error('Ingrese un correo valido')
      return
    }

    if (telefono.length < 6) {
      toast.error('El telefono debe tener al menos 6 caracteres')
      return
    }

    if (!editingUser && contrasena.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres')
      return
    }

    if (editingUser && contrasena && contrasena.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres')
      return
    }

    if (editingUser) {
      ;(async () => {
        try {
          const updated = await actualizarUsuario(editingUser.Id, {
            nombre,
            telefono,
            ...(contrasena ? { password: contrasena } : {}),
            rolId: formData.RolId,
            areaId: formData.AreaId,
            estado: formData.Estado,
          })

          const roleName = normalizeRole(updated.rol)
          const rolId = ROLE_OPTIONS.find(r => r.nombre === roleName)?.id ?? formData.RolId
          const areaObj = areas.find(a => a.Id === formData.AreaId)

          setUsuarios(prev =>
            prev.map(u =>
              u.Id === editingUser.Id
                ? {
                    ...u,
                    ...formData,
                    RolId: rolId,
                    AreaId: formData.AreaId,
                    rol: { id: rolId, nombre: roleName, descripcion: roleName },
                    area: areaObj,
                  }
                : u
            )
          )

          toast.success('Usuario actualizado')
          setDialogOpen(false)
        } catch (error) {
          toast.error(extractApiErrorMessage(error))
        }
      })()
    } else {
      ;(async () => {
        try {
          const created = await crearUsuario({
            nombre,
            correo,
            telefono,
            password: contrasena,
            estado: formData.Estado,
            rolId: formData.RolId,
            areaId: formData.AreaId,
          })

          const roleName = normalizeRole(created.rol)
          const rolId = ROLE_OPTIONS.find(r => r.nombre === roleName)?.id ?? formData.RolId
          const areaObj = areas.find(a => a.Id === formData.AreaId)

          const newUser: Usuario = {
            Id: created.Id ?? created.id ?? 0,
            Nombre: created.Nombre ?? created.nombre ?? '',
            Correo: created.Correo ?? created.correo ?? '',
            Telefono: created.Telefono ?? created.telefono ?? '',
            Estado: String(created.estado).toLowerCase() === 'true' || String(created.estado).toLowerCase() === 'activo',
            RolId: rolId,
            AreaId: formData.AreaId,
            ContrasenaHash: '',
            FechaCreacion: '',
            FechaModificacion: '',
            rol: { id: rolId, nombre: roleName, descripcion: roleName },
            area: areaObj,
          }
          setUsuarios(prev => [...prev, newUser])
          toast.success('Usuario creado')
          setDialogOpen(false)
        } catch (error) {
          toast.error(extractApiErrorMessage(error))
        }
      })()
    }
  }

  const handleToggleActive = async (userId: number) => {
    const current = usuarios.find(u => u.Id === userId)
    if (!current) return

    try {
      await actualizarUsuario(userId, { estado: !current.Estado })
      setUsuarios(prev => prev.map(u => (u.Id === userId ? { ...u, Estado: !u.Estado } : u)))
      toast.success('Estado de usuario actualizado')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  const handleDelete = async (userId: number) => {
    try {
      await eliminarUsuario(userId)
      setUsuarios(prev => prev.filter(u => u.Id !== userId))
      toast.success('Usuario eliminado')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administre los usuarios del sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Usuario</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Modifique los datos del usuario'
                  : 'Complete los datos para crear un nuevo usuario'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  value={formData.Nombre}
                  onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                  placeholder="Nombre del usuario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo electrónico</Label>
                <Input
                  id="correo"
                  name="usuario-correo"
                  type="email"
                  autoComplete="off"
                  value={formData.Correo}
                  onChange={(e) => setFormData({ ...formData, Correo: e.target.value })}
                    placeholder="correo@tu-dominio.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.Telefono}
                  onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                  placeholder="000-000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrasena">Contraseña</Label>
                <Input
                  id="contrasena"
                  name="usuario-contrasena"
                  type="password"
                  autoComplete="new-password"
                  value={formData.ContrasenaHash}
                  onChange={(e) => setFormData({ ...formData, ContrasenaHash: e.target.value })}
                  placeholder={editingUser ? 'Dejar en blanco para no cambiar' : '********'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol</Label>
                  <Select
                    value={formData.RolId.toString() || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, RolId: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="rol">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((rol) => (
                        <SelectItem key={rol.id} value={rol.id.toString()}>
                          {rol.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Área</Label>
                  <Select
                    value={formData.AreaId.toString() || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, AreaId: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="area">
                      <SelectValue placeholder="Seleccionar" />
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
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="estado">Activo</Label>
                <Switch
                  id="estado"
                  checked={formData.Estado}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, Estado: checked })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaCreacion">Fecha creación</Label>
                  <Input
                    id="fechaCreacion"
                    value={formData.FechaCreacion && !isNaN(new Date(formData.FechaCreacion).getTime())
                      ? format(new Date(formData.FechaCreacion), 'PPp', { locale: es })
                      : formData.FechaCreacion || ''}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaModificacion">Fecha modificación</Label>
                  <Input
                    id="fechaModificacion"
                    value={formData.FechaModificacion && !isNaN(new Date(formData.FechaModificacion).getTime())
                      ? format(new Date(formData.FechaModificacion), 'PPp', { locale: es })
                      : formData.FechaModificacion || ''}
                    disabled
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="buscar-usuarios"
                autoComplete="off"
                placeholder="Buscar usuarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={roleFilter?.toString() || 'all'}
              onValueChange={(value) => setRoleFilter(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {ROLE_OPTIONS.map((rol) => (
                  <SelectItem key={rol.id} value={rol.id.toString()}>
                    {rol.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={areaFilter?.toString() || 'all'}
              onValueChange={(value) => setAreaFilter(value === 'all' ? null : parseInt(value))}
              disabled={areas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {areas.filter((a) => a.Estado).map((area) => (
                  <SelectItem key={area.Id} value={area.Id.toString()}>
                    {area.NombreArea}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Usuarios ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile list (prevents horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <div
                key={user.Id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{user.Nombre}</p>
                    {getRoleBadge(user.rol?.nombre || '')}
                    <Badge variant={user.Estado ? 'default' : 'secondary'}>
                      {user.Estado ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    <p className="min-w-0 break-words">{user.Correo}</p>
                    <p className="min-w-0 break-words">{user.Telefono}</p>
                    <p className="min-w-0 break-words">{user.area?.NombreArea || '-'}</p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(user.Id)}>
                      {user.Estado ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(user.Id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Usuario</TableHead>
                  <TableHead className="w-[14%]">Rol</TableHead>
                  <TableHead className="w-[20%]">Área</TableHead>
                  <TableHead className="w-[12%]">Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Registrado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.Id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.Nombre}</p>
                        <p className="text-sm text-muted-foreground break-words whitespace-normal">
                          {user.Correo}
                        </p>
                        <p className="text-sm text-muted-foreground break-words whitespace-normal">
                          {user.Telefono}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.rol?.nombre || '')}</TableCell>
                    <TableCell className="break-words whitespace-normal">{user.area?.NombreArea}</TableCell>
                    <TableCell>
                      <Badge variant={user.Estado ? 'default' : 'secondary'}>
                        {user.Estado ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {user.FechaCreacion && !isNaN(new Date(user.FechaCreacion).getTime())
                        ? format(new Date(user.FechaCreacion), 'PP', { locale: es })
                        : user.FechaCreacion || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(user.Id)}>
                            {user.Estado ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user.Id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
