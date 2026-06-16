'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Area, Categoria } from '@/lib/types'
import { listarAreas } from '@/lib/api/areaService'
import {
  actualizarCategoria,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
} from '@/lib/api/categoriaService'

const normalizeEstadoToBoolean = (rawEstado: unknown): boolean => {
  if (typeof rawEstado === 'boolean') return rawEstado
  if (typeof rawEstado === 'number') return rawEstado === 1
  if (typeof rawEstado === 'string') {
    const s = rawEstado.trim().toLowerCase()
    return s === 'activo' || s === 'activa' || s === 'true' || s === '1'
  }
  return false
}

const extractApiErrorMessage = (error: any): string => {
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

export function CategoriesManagement() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Categoria | null>(null)
  const [formData, setFormData] = useState({
    AreaId: 0,
    Nombre: '',
    Descripcion: '',
    Estado: true,
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [areasData, catsData] = await Promise.all([listarAreas(), listarCategorias()])
        if (!mounted) return
        
        setAreas((Array.isArray(areasData) ? areasData : []).map((a: any) => ({
          Id: a.Id ?? a.id,
          NombreArea: a.NombreArea ?? a.nombreArea ?? a.nombre,
          Estado: (() => {
            const rawEstado = a?.Estado ?? a?.estado
            if (typeof rawEstado === 'boolean') return rawEstado
            if (typeof rawEstado === 'number') return rawEstado === 1
            if (typeof rawEstado === 'string') {
              const s = rawEstado.trim().toLowerCase()
              return s === 'activo' || s === 'activa' || s === 'true' || s === '1'
            }
            return false
          })(),
        })))

        setCategorias((Array.isArray(catsData) ? catsData : []).map((c: any) => ({
          Id: c.Id ?? c.id,
          AreaId: c.AreaId ?? c.areaId ?? c.area_id ?? 0,
          Nombre:
            c.Nombre ??
            c.nombre ??
            c.NombreCategoria ??
            c.nombreCategoria ??
            c.nombre_categoria ??
            c.name ??
            '',
          Descripcion: c.Descripcion ?? c.descripcion ?? '',
          Estado: normalizeEstadoToBoolean(c?.Estado ?? c?.estado),
        })))
      } catch {
        if (!mounted) return
        setAreas([])
        setCategorias([])
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleOpenDialog = (item?: Categoria) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        AreaId: item.AreaId,
        Nombre: item.Nombre,
        Descripcion: item.Descripcion,
        Estado: item.Estado,
      })
    } else {
      setEditingItem(null)
      setFormData({ AreaId: 0, Nombre: '', Descripcion: '', Estado: true })
    }
    setTimeout(() => setDialogOpen(true), 0)
  }

  const handleSave = async () => {
    if (!formData.AreaId || formData.Nombre.length < 2 || formData.Descripcion.length < 2) {
      toast.error('Complete los campos obligatorios (mínimo 2 caracteres)')
      return
    }

    if (editingItem) {
      try {
        await actualizarCategoria(editingItem.Id, {
          AreaId: formData.AreaId,
          Nombre: formData.Nombre,
          Descripcion: formData.Descripcion,
          Estado: formData.Estado,
        })
        const normalized = {
          ...editingItem,
          ...formData,
        }
        setCategorias(prev => prev.map(c => (c.Id === editingItem.Id ? normalized : c)))
        toast.success('Categoría actualizada')
      } catch (error) {
        toast.error(extractApiErrorMessage(error))
        return
      }
    } else {
      try {
        const created = await crearCategoria({
          AreaId: formData.AreaId,
          Nombre: formData.Nombre,
          Descripcion: formData.Descripcion,
          Estado: formData.Estado,
        })
        const normalized = {
          ...formData,
          Id: created.Id,
        }
        setCategorias(prev => [...prev, normalized])
        toast.success('Categoría creada')
      } catch (error) {
        toast.error(extractApiErrorMessage(error))
        return
      }
    }

    setDialogOpen(false)
  }

  const handleDelete = async (id: number) => {
    try {
      await eliminarCategoria(id)
      const fresh = await listarCategorias()
      setCategorias(
        (Array.isArray(fresh) ? fresh : []).map((c: any) => ({
          Id: c.Id ?? c.id,
          AreaId: c.AreaId ?? c.areaId ?? c.area_id ?? 0,
          Nombre:
            c.Nombre ??
            c.nombre ??
            c.NombreCategoria ??
            c.nombreCategoria ??
            c.nombre_categoria ??
            c.name ??
            '',
          Descripcion: c.Descripcion ?? c.descripcion ?? '',
          Estado: normalizeEstadoToBoolean(c?.Estado ?? c?.estado),
        }))
      )
      toast.success('Categoría eliminada')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  const handleToggleActive = async (id: number) => {
    const current = categorias.find(c => c.Id === id)
    if (!current) return

    try {
      await actualizarCategoria(id, {
        AreaId: current.AreaId,
        Nombre: current.Nombre,
        Descripcion: current.Descripcion,
        Estado: !current.Estado,
      })
      setCategorias(prev => prev.map(c => (c.Id === id ? { ...c, Estado: !c.Estado } : c)))
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  const getAreaName = (areaId: number) => {
    return areas.find(a => a.Id === areaId)?.NombreArea || 'Sin área'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
          <p className="text-muted-foreground">
            Administre las categorías de tickets
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva Categoría</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Modifique los datos de la categoría'
                  : 'Complete los datos para crear una nueva categoría'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="area">Área *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.Nombre}
                  onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                  placeholder="Nombre de la categoría"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.Descripcion}
                  onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                  placeholder="Descripción de la categoría"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activo">Activa</Label>
                <Switch
                  id="activo"
                  checked={formData.Estado}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, Estado: checked })
                  }
                />
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

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Categorías ({categorias.length})</CardTitle>
          <CardDescription>
            Lista de categorías disponibles para clasificar tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile list (prevents horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {categorias.map((cat) => (
              <div
                key={cat.Id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{cat.Nombre}</p>
                    <Badge variant={cat.Estado ? 'default' : 'secondary'}>
                      {cat.Estado ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    <p className="min-w-0 break-words">{getAreaName(cat.AreaId)}</p>
                    {cat.Descripcion ? (
                      <p className="min-w-0 break-words">{cat.Descripcion}</p>
                    ) : null}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(cat)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(cat.Id)}>
                      {cat.Estado ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(cat.Id)}
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
                  <TableHead className="w-[28%]">Área</TableHead>
                  <TableHead className="w-[26%]">Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead className="w-[14%]">Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((cat) => (
                  <TableRow key={cat.Id}>
                    <TableCell className="text-muted-foreground">
                      <span className="break-words whitespace-normal">{getAreaName(cat.AreaId)}</span>
                    </TableCell>
                    <TableCell className="font-medium break-words whitespace-normal">
                      {cat.Nombre}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      <span className="break-words whitespace-normal">{cat.Descripcion}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.Estado ? 'default' : 'secondary'}>
                        {cat.Estado ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(cat)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(cat.Id)}>
                            {cat.Estado ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(cat.Id)}
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
