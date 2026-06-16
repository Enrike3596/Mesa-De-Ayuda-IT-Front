'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, MoreHorizontal, Clock } from 'lucide-react'
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
import type { Prioridad } from '@/lib/types'
import {
  actualizarPrioridad,
  crearPrioridad,
  eliminarPrioridad,
  listarPrioridades,
} from '@/lib/api/prioridadService'

export function PrioritiesManagement() {
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Prioridad | null>(null)
  const [formData, setFormData] = useState({
    Nombre: '',
    Tipo: '',
    Hora_sla: 0,
    Estado: true,
  })

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await listarPrioridades()
        if (!mounted) return
        const mapped = (Array.isArray(data) ? data : []).map((p: any) => ({
          Id: p.Id ?? p.id,
          Nombre: p.Nombre ?? p.nombre ?? p.nombrePrioridad ?? p.nombre_prioridad ?? p.name ?? '',
          Tipo: p.Tipo ?? p.tipo,
          Hora_sla: p.Hora_sla ?? p.hora_sla ?? p.horaSla ?? p.horas_sla ?? p.sla ?? 0,
          Estado: p.Estado ?? p.estado ?? true,
        }))
        setPrioridades(mapped)
      } catch {
        if (!mounted) return
        setPrioridades([])
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleOpenDialog = (item?: Prioridad) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        Nombre: item.Nombre,
        Tipo: item.Tipo,
        Hora_sla: item.Hora_sla,
        Estado: item.Estado,
      })
    } else {
      setEditingItem(null)
      setFormData({ Nombre: '', Tipo: '', Hora_sla: 8, Estado: true })
    }
    setTimeout(() => setDialogOpen(true), 0)
  }

  const handleSave = async () => {
    if (!formData.Nombre || !formData.Tipo || formData.Hora_sla <= 0) {
      toast.error('Complete todos los campos correctamente')
      return
    }

    if (editingItem) {
      try {
        await actualizarPrioridad(editingItem.Id, {
          Nombre: formData.Nombre,
          Tipo: formData.Tipo,
          Hora_sla: formData.Hora_sla,
          Estado: formData.Estado,
        })
        const normalized = {
          ...editingItem,
          ...formData,
        }
        setPrioridades(prev => prev.map(p => (p.Id === editingItem.Id ? normalized : p)))
        toast.success('Prioridad actualizada')
      } catch {
        toast.error('No se pudo actualizar la prioridad')
        return
      }
    } else {
      try {
        const created = await crearPrioridad({
          Nombre: formData.Nombre,
          Tipo: formData.Tipo,
          Hora_sla: formData.Hora_sla,
          Estado: formData.Estado,
        })
        const normalized = {
          ...formData,
          Id: created.Id,
        }
        setPrioridades(prev => [...prev, normalized])
        toast.success('Prioridad creada')
      } catch (error: any) {
        toast.error('No se pudo crear la prioridad')
        return
      }
    }

    setDialogOpen(false)
  }

  const handleDelete = async (id: number) => {
    try {
      await eliminarPrioridad(id)
      setPrioridades(prev => prev.filter(p => p.Id !== id))
      toast.success('Prioridad eliminada')
    } catch {
      toast.error('No se pudo eliminar la prioridad')
    }
  }

  const handleToggleEstado = async (id: number) => {
    const current = prioridades.find(p => p.Id === id)
    if (!current) return

    try {
      await actualizarPrioridad(id, {
        Nombre: current.Nombre,
        Tipo: current.Tipo,
        Hora_sla: current.Hora_sla,
        Estado: !current.Estado,
      })
      setPrioridades(prev => prev.map(p => (p.Id === id ? { ...p, Estado: !p.Estado } : p)))
      toast.success('Estado actualizado')
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prioridades</h1>
          <p className="text-muted-foreground">
            Administre los niveles de prioridad y SLA
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false) }}>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Prioridad
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Prioridad' : 'Nueva Prioridad'}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Modifique los datos de la prioridad'
                  : 'Complete los datos para crear una nueva prioridad'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.Nombre}
                  onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                  placeholder="Nombre de la prioridad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={formData.Tipo}
                  onChange={(e) => setFormData({ ...formData, Tipo: e.target.value })}
                  placeholder="Incidente / Solicitud"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sla">Tiempo SLA (horas)</Label>
                <Input
                  id="sla"
                  type="number"
                  min={1}
                  value={formData.Hora_sla}
                  onChange={(e) =>
                    setFormData({ ...formData, Hora_sla: parseInt(e.target.value) || 0 })
                  }
                  placeholder="Horas para resolver"
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo máximo para resolver tickets de esta prioridad
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="estado">Activa</Label>
                <Switch
                  id="estado"
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

      <Card>
        <CardHeader>
          <CardTitle>Prioridades ({prioridades.length})</CardTitle>
          <CardDescription>
            Niveles de prioridad disponibles para clasificar tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile list (prevents horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {prioridades.map((pri) => (
              <div
                key={pri.Id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-medium">{pri.Nombre}</p>
                    <Badge variant={pri.Estado ? 'default' : 'secondary'}>
                      {pri.Estado ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    <p className="min-w-0 break-words">{pri.Tipo}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{pri.Hora_sla}h SLA</span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(pri)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleEstado(pri.Id)}>
                      {pri.Estado ? 'Desactivar' : 'Activar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(pri.Id)}
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
                  <TableHead className="w-[26%]">Prioridad</TableHead>
                  <TableHead className="w-[22%]">Tipo</TableHead>
                  <TableHead className="w-[18%]">Horas SLA</TableHead>
                  <TableHead className="w-[14%]">Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prioridades.map((pri) => (
                  <TableRow key={pri.Id}>
                    <TableCell className="font-medium break-words whitespace-normal">
                      {pri.Nombre}
                    </TableCell>
                    <TableCell className="text-muted-foreground break-words whitespace-normal">
                      {pri.Tipo}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{pri.Hora_sla}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pri.Estado ? 'default' : 'secondary'}>
                        {pri.Estado ? 'Activa' : 'Inactiva'}
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
                          <DropdownMenuItem onClick={() => handleOpenDialog(pri)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleEstado(pri.Id)}>
                            {pri.Estado ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(pri.Id)}
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
