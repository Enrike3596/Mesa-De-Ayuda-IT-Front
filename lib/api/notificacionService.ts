import axios from 'axios'
import type { Notification } from '@/lib/types'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const nameEq = `${encodeURIComponent(name)}=`
  const cookies = document.cookie.split(';')
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim()
    if (cookie.startsWith(nameEq)) return decodeURIComponent(cookie.slice(nameEq.length))
  }
  return null
}

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5214/api'

// Instancia separada SIN el interceptor 401 para evitar redirects infinitos
const notifApi = axios.create({ baseURL })

notifApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getCookie('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export function normalizeNotificacion(raw: any): Notification {
  return {
    id: raw?.id ?? raw?.Id ?? 0,
    tipo: raw?.tipo ?? raw?.Tipo ?? 'TICKET_ACTUALIZADO',
    mensaje: raw?.mensaje ?? raw?.Mensaje ?? '',
    ticket_id: raw?.ticket_id ?? raw?.TicketId ?? raw?.ticketId ?? 0,
    usuario_id: raw?.usuario_id ?? raw?.UsuarioId ?? raw?.usuarioId ?? undefined,
    leida: raw?.leida ?? raw?.Leida ?? false,
    created_at: raw?.created_at ?? raw?.FechaCreacion ?? raw?.fechaCreacion ?? '',
  }
}

export async function listarNotificaciones(): Promise<Notification[]> {
  const response = await notifApi.get<any>('/Notificacion')
  const data = response.data
  const items = Array.isArray(data) ? data : []
  return items.map(normalizeNotificacion)
}

export async function marcarComoLeida(id: number): Promise<void> {
  await notifApi.put(`/Notificacion/${id}/leer`)
}

export async function marcarTodasComoLeidas(): Promise<void> {
  await notifApi.put('/Notificacion/leer-todas')
}
