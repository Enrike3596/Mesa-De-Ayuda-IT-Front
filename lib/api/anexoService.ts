import api from './axiosConfig'

import type { TkAnexo } from '@/lib/types'

const BASE = '/tkanexo'

export const EXTENSIONES_PERMITIDAS = [
  'png', 'jpg', 'jpeg', 'pdf', 'docx', 'xlsx', 'txt'
] as const

export const EXTENSIONES_BLOQUEADAS = [
  'exe', 'bat', 'cmd', 'ps1', 'sh'
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export type ExtensionPermitida = typeof EXTENSIONES_PERMITIDAS[number]

export function validarArchivo(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (!EXTENSIONES_PERMITIDAS.includes(extension as ExtensionPermitida)) {
    return `Extensión ".${extension}" no permitida. Extensiones aceptadas: ${EXTENSIONES_PERMITIDAS.join(', ')}`
  }

  if (EXTENSIONES_BLOQUEADAS.includes(extension as any)) {
    return `Extensión ".${extension}" bloqueada por seguridad.`
  }

  if (file.size > MAX_FILE_SIZE) {
    const mb = MAX_FILE_SIZE / (1024 * 1024)
    return `El archivo excede el tamaño máximo de ${mb}MB.`
  }

  if (file.size === 0) {
    return 'El archivo está vacío.'
  }

  return null
}

export async function subirAnexo(
  file: File,
  ticketId: number,
  usuarioId: number
): Promise<TkAnexo> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('NombreArchivo', file.name)
  formData.append('TipoArchivo', file.type || 'application/octet-stream')
  formData.append('TamanoArchivo', file.size.toString())
  // Send both casings to match backend tolerance across versions.
  formData.append('TicketId', ticketId.toString())
  formData.append('UsuarioId', usuarioId.toString())
  formData.append('Estado', 'Activo')
  // Some backends validate this field even in upload endpoints.
  // The server should overwrite it with the stored file URL.
  formData.append('UrlArchivo', file.name)

  const response = await api.post<any>(`${BASE}/upload`, formData)

  // Some backends return a DTO that doesn't exactly match TkAnexo.
  const normalized = normalizeAnexo(response.data)
  // Fallback if the backend doesn't echo fields back.
  if (!normalized?.NombreArchivo) {
    return {
      Id: normalized?.Id ?? 0,
      NombreArchivo: file.name,
      TipoArchivo: file.type || 'application/octet-stream',
      TamanoArchivo: file.size,
      UrlArchivo: normalized?.UrlArchivo ?? '',
      FechaCarga: normalized?.FechaCarga ?? new Date().toISOString(),
      UsuarioId: usuarioId,
      TicketId: ticketId,
      Estado: normalized?.Estado ?? 'Activo',
    }
  }
  return normalized
}

function normalizeAnexo(raw: any): TkAnexo {
  // Backend may return TicketId/UsuarioId as 0 and also send ticketId/usuarioId.
  return {
    Id: raw?.Id ?? raw?.id ?? 0,
    NombreArchivo: raw?.NombreArchivo ?? raw?.nombreArchivo ?? raw?.nombre_archivo ?? '',
    TipoArchivo: raw?.TipoArchivo ?? raw?.tipoArchivo ?? raw?.tipo_archivo ?? '',
    TamanoArchivo: Number(raw?.TamanoArchivo ?? raw?.tamanoArchivo ?? raw?.tamano_archivo ?? raw?.size ?? 0),
    UrlArchivo: raw?.UrlArchivo ?? raw?.urlArchivo ?? raw?.url_archivo ?? raw?.ruta ?? '',
    FechaCarga: raw?.FechaCarga ?? raw?.fechaCarga ?? raw?.fecha_carga ?? raw?.createdAt ?? '',
    UsuarioId: Number(raw?.UsuarioId ?? raw?.usuarioId ?? raw?.UsuarioID ?? raw?.usuario_id ?? 0),
    TicketId: Number(raw?.TicketId ?? raw?.ticketId ?? raw?.TicketID ?? raw?.ticket_id ?? 0),
    Estado: raw?.Estado ?? raw?.estado ?? 'Activo',
  }
}

export async function listarAnexosPorTicket(ticketId: number): Promise<TkAnexo[]> {
  // Backend now supports server-side filtering.
  // Prefer query-string to avoid route casing issues.
  try {
    const res = await api.get<any>(`${BASE}?ticketId=${ticketId}`)
    const raw = res.data
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
    return arr.map(normalizeAnexo)
  } catch {
    // Fallback alternative route.
    const res = await api.get<any>(`${BASE}/ticket/${ticketId}`)
    const raw = res.data
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
    return arr.map(normalizeAnexo)
  }
}

function getApiBaseUrl(): string {
  const url = api.defaults.baseURL ?? 'http://localhost:5214/api'
  return url.replace(/\/api\/?$/, '')
}

export function getUrlArchivoCompleto(anexo: TkAnexo): string {
  if (anexo.UrlArchivo && anexo.UrlArchivo.startsWith('http')) return anexo.UrlArchivo
  if (anexo.UrlArchivo) return `${getApiBaseUrl()}${anexo.UrlArchivo}`

  // Fallbacks when backend doesn't return a direct URL.
  const apiBase = api.defaults.baseURL ?? 'http://localhost:5214/api'
  const cleanApiBase = apiBase.replace(/\/$/, '')
  return `${cleanApiBase}${BASE}/download/${anexo.Id}`
}

export function getFileIconUrl(anexo: TkAnexo): string {
  const ext = anexo.NombreArchivo.split('.').pop()?.toLowerCase() ?? ''
  const imageExts = ['png', 'jpg', 'jpeg']
  if (imageExts.includes(ext)) {
    return getUrlArchivoCompleto(anexo)
  }
  return ''
}

export function isImageFile(anexo: TkAnexo): boolean {
  const ext = anexo.NombreArchivo.split('.').pop()?.toLowerCase() ?? ''
  return ['png', 'jpg', 'jpeg'].includes(ext)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
