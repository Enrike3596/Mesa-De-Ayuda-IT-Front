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
import { Switch } from '@/components/ui/switch'
import type { Area } from '@/lib/types'
import { actualizarArea, crearArea, eliminarArea, listarAreas } from '@/lib/api/areaService'

function normalizeEstado(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw === 1
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase()
    return s === 'activo' || s === 'activa' || s === 'true' || s === '1' || s === 'enabled'
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

export function AreasManagement() {
  const [areas, setAreas] = useState<Area[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Area | null>(null)
  const [formData, setFormData] = useState<{ NombreArea: string; Estado: boolean }>({
    NombreArea: '',
    Estado: true,
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const data = await listarAreas()
        if (!mounted) return

        const mapped: Area[] = (Array.isArray(data) ? data : []).map((a: any) => ({
          Id: a.Id ?? a.id ?? 0,
          NombreArea: a.NombreArea ?? a.nombreArea ?? a.nombre ?? a.nombre_area ?? '',
          Estado: normalizeEstado(a?.Estado ?? a?.estado),
        }))

        setAreas(mapped)
      } catch {
        if (!mounted) return
        setAreas([])
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleOpenDialog = (item?: Area) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        NombreArea: item.NombreArea,
        Estado: item.Estado,
      })
    } else {
      setEditingItem(null)
      setFormData({ NombreArea: '', Estado: true })
    }
    setTimeout(() => setDialogOpen(true), 0)
  }

  const handleSave = async () => {
    const nombre = formData.NombreArea.trim()
    if (nombre.length < 2) {
      toast.error('El nombre del área debe tener al menos 2 caracteres')
      return
    }

    const normalizedNombre = nombre.toLowerCase()
    const duplicated = areas.some((area) => {
      if (editingItem && area.Id === editingItem.Id) return false
      return area.NombreArea.trim().toLowerCase() === normalizedNombre
    })

    if (duplicated) {
      toast.error('Ya existe un área con ese nombre')
      return
    }

    if (editingItem) {
      try {
        await actualizarArea(editingItem.Id, {
          NombreArea: nombre,
          // TS: endpoint espera boolean, normalizamos el lado cliente
          Estado: formData.Estado,
        })

        const normalized: Area = {
          ...editingItem,
          ...formData,
          Id: editingItem.Id,
        }

        setAreas((prev) => prev.map((a) => (a.Id === editingItem.Id ? normalized : a)))
        toast.success('Área actualizada')
      } catch (error) {
        toast.error(extractApiErrorMessage(error))
        return
      }
    } else {
      try {
        const created = await crearArea({
          NombreArea: nombre,
          Estado: formData.Estado,
        })

        const normalized: Area = {
          NombreArea: created.NombreArea,
          Estado: created.Estado,
          Id: created.Id,
        }

        setAreas((prev) => [...prev, normalized])
        toast.success('Área creada')
      } catch (error) {
        toast.error(extractApiErrorMessage(error))
        return
      }
    }

    setDialogOpen(false)
  }

  const handleDelete = async (id: number) => {
    try {
      await eliminarArea(id)
      const fresh = await listarAreas()
      const mapped: Area[] = (Array.isArray(fresh) ? fresh : []).map((a: any) => ({
        Id: a.Id ?? a.id ?? 0,
        NombreArea: a.NombreArea ?? a.nombreArea ?? a.nombre ?? a.nombre_area ?? '',
        Estado: normalizeEstado(a?.Estado ?? a?.estado),
      }))
      setAreas(mapped)
      toast.success('Área eliminada')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  const handleToggleActive = async (id: number) => {
    const current = areas.find((a) => a.Id === id)
    if (!current) return

    try {
        await actualizarArea(id, {
          NombreArea: current.NombreArea,
          Estado: !current.Estado,
        })

      setAreas((prev) => prev.map((a) => (a.Id === id ? { ...a, Estado: !a.Estado } : a)))
      toast.success('Estado actualizado')
    } catch (error) {
      toast.error(extractApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Áreas</h1>
          <p className="text-muted-foreground">Administre las áreas de la organización</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Área
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Área' : 'Nueva Área'}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Modifique los datos del área'
                  : 'Complete los datos para crear una nueva área'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.NombreArea}
                  onChange={(e) => setFormData({ ...formData, NombreArea: e.target.value })}
                  placeholder="Nombre del área"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="activo">Activa</Label>
                <Switch
                  id="activo"
                  checked={formData.Estado}
                  onCheckedChange={(checked) => setFormData({ ...formData, Estado: checked })}
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

      <Card>
        <CardHeader>
          <CardTitle>Áreas ({areas.length})</CardTitle>
          <CardDescription>Lista de áreas de la organización</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile list (prevents horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {areas.map((area) => (
              <div
                key={area.Id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{area.NombreArea}</p>
                    <Badge variant={area.Estado ? 'default' : 'secondary'}>
                      {area.Estado ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(area)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(area.Id)}>
                      {area.Estado ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(area.Id)}
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
                  <TableHead className="w-[70%]">Nombre</TableHead>
                  <TableHead className="w-[18%]">Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.map((area) => (
                  <TableRow key={area.Id}>
                    <TableCell className="font-medium break-words whitespace-normal">
                      {area.NombreArea}
                    </TableCell>
                    <TableCell>
                      <Badge variant={area.Estado ? 'default' : 'secondary'}>
                        {area.Estado ? 'Activa' : 'Inactiva'}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(area)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(area.Id)}>
                            {area.Estado ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(area.Id)}
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

