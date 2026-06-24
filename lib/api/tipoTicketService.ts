import api from './axiosConfig'
import type { TipoTicketInfo } from '@/lib/types'

const BASE = '/tipoticket'

export async function listarTipoTickets(): Promise<TipoTicketInfo[]> {
  const response = await api.get<any>(BASE)
  const data = response.data
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : []
  return items.map((raw: any) => ({
    Id: raw?.Id ?? raw?.id ?? 0,
    Nombre: raw?.Nombre ?? raw?.nombre ?? '',
  }))
}
