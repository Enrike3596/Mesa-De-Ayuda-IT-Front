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
import type { Categoria, Subcategoria } from '@/lib/types'
import { listarCategorias } from '@/lib/api/categoriaService'
import {
  actualizarSubcategoria,
  crearSubcategoria,
  eliminarSubcategoria,
  listarSubcategorias,
} from '@/lib/api/subcategoriaService'

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

export function SubcategoriesManagement() {
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Subcategoria | null>(null)
  const [formData, setFormData] = useState({
    CategoriaId: 0,
    NombreSubcategoria: '',
    Descripcion: '',
    Estado: true,
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [catsData, subsData] = await Promise.all([listarCategorias(), listarSubcategorias()])
        if (!mounted) return

        setCategorias((Array.isArray(catsData) ? catsData : []).map((c: any) => ({
          Id: c.Id ?? c.id,
          AreaId: c.AreaId ?? c.areaId ?? c.area_id ?? 0,
          TipoTicketId: c.TipoTicketId ?? c.tipoTicketId ?? c.tipo_ticket_id ?? 0,
          Nombre: c.Nombre ?? c.nombre ?? c.NombreCategoria ?? c.nombreCategoria ?? '',
          Descripcion: c.Descripcion ?? c.descripcion ?? '',
          Estado: normalizeEstadoToBoolean(c?.Estado ?? c?.estado),
        })))

        setSubcategorias((Array.isArray(subsData) ? subsData : []).map((s: any) => ({
          Id: s.Id ?? s.id,
          CategoriaId: s.CategoriaId ?? s.categoriaId ?? s.categoria_id ?? 0,
          NombreSubcategoria:
            s.NombreSubcategoria ??
            s.nombreSubcategoria ??
            s.nombre_subcategoria ??
            s.Nombre ??
            s.nombre ??
            '',
          Descripcion: s.Descripcion ?? s.descripcion ?? '',
          Estado: normalizeEstadoToBoolean(s?.Estado ?? s?.estado),
        })))
      } catch {
        if (!mounted) return
        setCategorias([])
        setSubcategorias([])
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleOpenDialog = (item?: Subcategoria) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        CategoriaId: item.CategoriaId,
        NombreSubcategoria: item.NombreSubcategoria,
        Descripcion: item.Descripcion,
        Estado: item.Estado,
      })
    } else {
      setEditingItem(null)
      setFormData({ CategoriaId: 0, NombreSubcategoria: '', Descripcion: '', Estado: true })
    }
    setTimeout(() => setDialogOpen(true), 0)
  }

  const handleSave = async () => {
    if (!formData.CategoriaId || formData.NombreSubcategoria.length < 2 || formData.Descripcion.length < 2) {
      toast.error('Complete los campos obligatorios (mínimo 2 caracteres)')
      return
    }

    if (editingItem) {
      try {
        await actualizarSubcategoria(editingItem.Id, {
          CategoriaId: formData.CategoriaId,
          NombreSubcategoria: formData.NombreSubcategoria,
          Descripcion: formData.Descripcion,
          Estado: formData.Estado,
        })
        setSubcategorias(prev => prev.map(c => (c.Id === editingItem.Id ? { ...c, ...formData } : c)))
        toast.success('Subcategoría actualizada')
      } catch (error) {
        toast.error(extractApiErrorMessage(error))
        return
      }
    } else {
      try {
        const created = await crearSubcategoria({
          CategoriaId: formData.CategoriaId,
          NombreSubcategoria: formData.NombreSubcategoria,
          Descripcion: formData.Descripcion,
          Estado: formData.Estado,
        })
        setSubcategorias(prev => [...prev, { ...formData, Id: created.Id }])
        toast.success('Subcategoría creada')
      } catch (error) {
        toast.error(extractApiErrorMessage(error))
        return
      }
    }

    setDialogOpen(false)
  }

  const handleDelete = async (id: number) => {
    try {
      await eliminarSubcategoria(id)
      setSubcategorias(prev => prev.filter(s => s.Id !== id))
      toast.success('Subcategoría eliminada')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  const handleToggleActive = async (id: number) => {
    const current = subcategorias.find(s => s.Id === id)
    if (!current) return

    try {
      await actualizarSubcategoria(id, {
        CategoriaId: current.CategoriaId,
        NombreSubcategoria: current.NombreSubcategoria,
        Descripcion: current.Descripcion,
        Estado: !current.Estado,
      })
      setSubcategorias(prev => prev.map(s => (s.Id === id ? { ...s, Estado: !s.Estado } : s)))
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  const getCategoriaName = (categoriaId: number) => {
    return categorias.find(c => c.Id === categoriaId)?.Nombre || 'Sin categoría'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subcategorías</h1>
          <p className="text-muted-foreground">
            Administre las subcategorías asociadas a cada categoría
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva Subcategoría</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Modifique los datos de la subcategoría'
                  : 'Complete los datos para crear una nueva subcategoría'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={formData.CategoriaId.toString() || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, CategoriaId: parseInt(value) })
                  }
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.Estado).map((cat) => (
                      <SelectItem key={cat.Id} value={cat.Id.toString()}>
                        {cat.Nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.NombreSubcategoria}
                  onChange={(e) => setFormData({ ...formData, NombreSubcategoria: e.target.value })}
                  placeholder="Nombre de la subcategoría"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.Descripcion}
                  onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                  placeholder="Descripción de la subcategoría"
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
          <CardTitle>Subcategorías ({subcategorias.length})</CardTitle>
          <CardDescription>
            Lista de subcategorías asociadas a las categorías de tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile list (prevents horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {subcategorias.map((sub) => (
              <div
                key={sub.Id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{sub.NombreSubcategoria}</p>
                    <Badge variant={sub.Estado ? 'default' : 'secondary'}>
                      {sub.Estado ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    <p className="min-w-0 break-words">{getCategoriaName(sub.CategoriaId)}</p>
                    {sub.Descripcion ? (
                      <p className="min-w-0 break-words">{sub.Descripcion}</p>
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
                    <DropdownMenuItem onClick={() => handleOpenDialog(sub)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(sub.Id)}>
                      {sub.Estado ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(sub.Id)}
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
                  <TableHead className="w-[28%]">Categoría</TableHead>
                  <TableHead className="w-[28%]">Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
                  <TableHead className="w-[14%]">Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcategorias.map((sub) => (
                  <TableRow key={sub.Id}>
                    <TableCell className="text-muted-foreground">
                      <span className="break-words whitespace-normal">{getCategoriaName(sub.CategoriaId)}</span>
                    </TableCell>
                    <TableCell className="font-medium break-words whitespace-normal">
                      {sub.NombreSubcategoria}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      <span className="break-words whitespace-normal">{sub.Descripcion}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.Estado ? 'default' : 'secondary'}>
                        {sub.Estado ? 'Activa' : 'Inactiva'}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(sub)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(sub.Id)}>
                            {sub.Estado ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(sub.Id)}
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
