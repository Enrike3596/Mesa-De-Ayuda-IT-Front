import api from './axiosConfig'

import type { Area } from '@/lib/types'

const BASE = '/area'

type AreaUpsertInput =
  | Omit<Area, 'Id'>
  | {
      Id?: number
      NombreArea?: string
      Estado?: boolean
      id?: number
      nombreArea?: string
      estado?: boolean
      nombre_area?: string
    }

function normalizeEstado(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw === 1
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase()
    return s === 'activo' || s === 'activa' || s === 'true' || s === '1' || s === 'enabled'
  }
  return false
}

function normalizeArea(raw: any): Area {
  return {
    Id: raw?.Id ?? raw?.id ?? 0,
    NombreArea:
      raw?.NombreArea ?? raw?.nombreArea ?? raw?.nombre_area ?? raw?.nombre ?? '',
    Estado: normalizeEstado(raw?.Estado ?? raw?.estado),
  }
}

function toAreaApiPayload(input: Partial<AreaUpsertInput>) {
  const raw: any = input
  // Backend DTO (AreaCreate/Update) => NombreArea, Estado
  const estadoRaw = raw?.Estado ?? raw?.estado
  const estadoValue =
    typeof estadoRaw === 'boolean'
      ? estadoRaw
      : typeof estadoRaw === 'string'
        ? estadoRaw.trim().toLowerCase() === 'true' || estadoRaw.trim().toLowerCase() === 'activo'
        : Boolean(estadoRaw)

  const nombre = (raw?.NombreArea ?? raw?.nombreArea ?? raw?.nombre_area ?? raw?.nombre ?? '').trim()

  return {
    Id: raw?.Id ?? raw?.id,
    NombreArea: nombre,
    Estado: estadoValue,
  }
}


export async function listarAreas(): Promise<Area[]> {
  const response = await api.get<any>(BASE)
  const data = response.data
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : []
  return items.map(normalizeArea)
}


export async function crearArea(dto: AreaUpsertInput): Promise<Area> {
  const response = await api.post<any>(BASE, toAreaApiPayload(dto))
  return normalizeArea(response.data)
}

export async function actualizarArea(
  id: number,
  dto: Partial<AreaUpsertInput>
): Promise<Area> {
  const response = await api.put<any>(`${BASE}/${id}`, toAreaApiPayload({ ...dto, Id: id }))
  return normalizeArea(response.data)
}

export async function eliminarArea(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
