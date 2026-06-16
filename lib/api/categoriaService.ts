import api from './axiosConfig'

import type { Categoria } from '@/lib/types'

const BASE = '/categoria'

type CategoriaUpsertInput =
  | Omit<Categoria, 'Id'>
  | {
      Id?: number
      AreaId?: number
      Nombre?: string
      NombreCategoria?: string
      Descripcion?: string
      Estado?: boolean
      id?: number
      areaId?: number
      area_id?: number
      nombre?: string
      nombreCategoria?: string
      nombre_categoria?: string
      descripcion?: string
      estado?: boolean
    }

function normalizeCategoria(raw: any): Categoria {
  return {
    Id: raw?.Id ?? raw?.id ?? 0,
    AreaId: raw?.AreaId ?? raw?.areaId ?? raw?.area_id ?? 0,
    Nombre:
      raw?.Nombre ??
      raw?.nombre ??
      raw?.nombreCategoria ??
      raw?.nombre_categoria ??
      raw?.name ??
      '',
    Descripcion: raw?.Descripcion ?? raw?.descripcion ?? '',
    Estado: (() => {
      const e = raw?.Estado ?? raw?.estado
      if (typeof e === 'boolean') return e
      if (typeof e === 'number') return e === 1
      if (typeof e === 'string') {
        const s = e.trim().toLowerCase()
        return s === 'activo' || s === 'activa' || s === 'true' || s === '1'
      }
      return true
    })(),
  }
}

function toCategoriaApiPayload(input: Partial<CategoriaUpsertInput>) {
  const raw: any = input
  // Backend DTO (CategoriaCreate/Update) => NombreCategoria, Descripcion, AreaId, Estado (boolean)
  const estadoRaw = raw?.Estado ?? raw?.estado
  const estadoValue =
    typeof estadoRaw === 'boolean'
      ? estadoRaw
      : typeof estadoRaw === 'string'
        ? estadoRaw.trim().toLowerCase() === 'true' || estadoRaw.trim().toLowerCase() === 'activo'
        : Boolean(estadoRaw)

  return {
    Id: raw?.Id ?? raw?.id,
    NombreCategoria: raw?.NombreCategoria ?? raw?.Nombre ?? raw?.nombreCategoria ?? raw?.nombre_categoria ?? raw?.nombre,
    Nombre: raw?.Nombre ?? raw?.NombreCategoria ?? raw?.nombre ?? raw?.nombreCategoria,
    Descripcion: raw?.Descripcion ?? raw?.descripcion,
    AreaId: raw?.AreaId ?? raw?.areaId ?? raw?.area_id,
    Estado: estadoValue,
  }
}


export async function listarCategorias(): Promise<Categoria[]> {
  const response = await api.get<any>(BASE)
  const data = response.data
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : []
  return items.map(normalizeCategoria)
}


export async function crearCategoria(dto: CategoriaUpsertInput): Promise<Categoria> {
  const response = await api.post<any>(BASE, toCategoriaApiPayload(dto))
  return normalizeCategoria(response.data)
}

export async function actualizarCategoria(
  id: number,
  dto: Partial<CategoriaUpsertInput>
): Promise<Categoria> {
  const response = await api.put<any>(`${BASE}/${id}`, toCategoriaApiPayload({ ...dto, Id: id }))
  return normalizeCategoria(response.data)
}

export async function eliminarCategoria(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
