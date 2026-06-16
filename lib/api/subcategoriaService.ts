import api from './axiosConfig'

import type { Subcategoria } from '@/lib/types'

const BASE = '/subcategoria'

function normalizeSubcategoria(raw: any): Subcategoria {
  return {
    Id: raw?.Id ?? raw?.id ?? 0,
    CategoriaId: raw?.CategoriaId ?? raw?.categoriaId ?? raw?.categoria_id ?? 0,
    NombreSubcategoria:
      raw?.NombreSubcategoria ??
      raw?.nombreSubcategoria ??
      raw?.nombre_subcategoria ??
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

function toSubcategoriaApiPayload(input: any) {
  const raw: any = input
  const estadoRaw = raw?.Estado ?? raw?.estado
  const estadoValue =
    typeof estadoRaw === 'boolean'
      ? estadoRaw
      : typeof estadoRaw === 'string'
        ? estadoRaw.trim().toLowerCase() === 'true' || estadoRaw.trim().toLowerCase() === 'activo'
        : Boolean(estadoRaw)

  return {
    NombreSubcategoria: raw?.NombreSubcategoria ?? raw?.nombreSubcategoria ?? raw?.nombre_subcategoria ?? raw?.Nombre ?? raw?.nombre,
    Descripcion: raw?.Descripcion ?? raw?.descripcion,
    CategoriaId: raw?.CategoriaId ?? raw?.categoriaId ?? raw?.categoria_id,
    Estado: estadoValue,
  }
}

export async function listarSubcategorias(): Promise<Subcategoria[]> {
  const response = await api.get<any>(BASE)
  const data = response.data
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : []
  return items.map(normalizeSubcategoria)
}

export async function crearSubcategoria(dto: any): Promise<Subcategoria> {
  const response = await api.post<any>(BASE, toSubcategoriaApiPayload(dto))
  return normalizeSubcategoria(response.data)
}

export async function actualizarSubcategoria(id: number, dto: any): Promise<Subcategoria> {
  const response = await api.put<any>(`${BASE}/${id}`, toSubcategoriaApiPayload(dto))
  return normalizeSubcategoria(response.data)
}

export async function eliminarSubcategoria(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
