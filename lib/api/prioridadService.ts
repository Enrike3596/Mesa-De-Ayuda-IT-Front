import api from './axiosConfig'

import type { Prioridad } from '@/lib/types'

const BASE = '/prioridad'

type PrioridadUpsertInput =
  | Omit<Prioridad, 'Id'>
  | {
      Nombre?: string
      Tipo?: string
      Hora_sla?: number
      Estado?: boolean
      nombre?: string
      tipo?: string
      hora_sla?: number
      horaSla?: number
      sla?: number
      estado?: boolean
    }

function normalizePrioridad(raw: any): Prioridad {
  return {
    Id: raw?.Id ?? raw?.id ?? 0,
    Nombre:
      raw?.Nombre ?? raw?.nombre ?? raw?.nombrePrioridad ?? raw?.nombre_prioridad ?? raw?.name ?? '',
    Tipo: raw?.Tipo ?? raw?.tipo ?? '',
    Hora_sla:
      raw?.Hora_sla ??
      raw?.hora_sla ??
      raw?.horaSla ??
      raw?.horas_sla ??
      raw?.sla ??
      0,
    Estado: raw?.Estado ?? raw?.estado ?? true,
  }
}

function toPrioridadApiPayload(input: any): Record<string, unknown> {
  // Backend DTO (PrioridadCreate/Update) => NombrePrioridad, Tipo, Hora_sla, Estado
  const raw: any = input
  const nombre = raw?.NombrePrioridad ?? raw?.Nombre ?? raw?.nombrePrioridad ?? raw?.nombre_prioridad ?? raw?.nombre ?? ''

  const estado = raw?.Estado ?? raw?.estado

  return {
    NombrePrioridad: nombre,
    Tipo: raw?.Tipo ?? raw?.tipo ?? '',
    Hora_sla: raw?.Hora_sla ?? raw?.hora_sla ?? 0,
    Estado: estado === 'true' || estado === true,
  }
}


export async function listarPrioridades(): Promise<Prioridad[]> {
  const response = await api.get<any>(BASE)
  const data = response.data
  return (Array.isArray(data) ? data : []).map(normalizePrioridad)
}

export async function crearPrioridad(dto: PrioridadUpsertInput): Promise<Prioridad> {
  const response = await api.post<any>(BASE, toPrioridadApiPayload(dto))
  return normalizePrioridad(response.data)
}

export async function actualizarPrioridad(
  id: number,
  dto: Partial<PrioridadUpsertInput>
): Promise<Prioridad> {
  const response = await api.put<any>(`${BASE}/${id}`, toPrioridadApiPayload(dto))
  return normalizePrioridad(response.data)
}

export async function eliminarPrioridad(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`)
}
