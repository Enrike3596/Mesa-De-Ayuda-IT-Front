import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Ticket, TicketSlaInfo } from '@/lib/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte una fecha o string de fecha a formato YYYY-MM-DD de forma segura.
 */
export function formatISODate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return (d instanceof Date && !isNaN(d.getTime())) ? d.toISOString().slice(0, 10) : '';
}

const ESTADOS_ABIERTOS = new Set(['ABIERTO', 'EN_PROCESO', 'EN_ESPERA', 'PROGRAMADO', 'PENDIENTE_CONFIRMACION', 'REABIERTO'])

function normalizeSlaEstado(estadoSla?: string | null): string {
  return String(estadoSla ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
}

export function isTicketCerradoVencido(
  ticket: Pick<
    Ticket,
    | 'estado'
    | 'created_at'
    | 'updated_at'
    | 'fecha_resolucion'
    | 'fecha_confirmacion_cierre'
    | 'prioridad'
    | 'estado_sla'
    | 'horas_sla'
    | 'sla_vencido'
    | 'tiempo_acumulado_pausa_minutos'
  >
): boolean {
  if (ticket.estado !== 'CERRADO') return false

  const estadoSla = normalizeSlaEstado(ticket.estado_sla)
  if (estadoSla === 'RESUELTO_VENCIDO') return true
  if (estadoSla === 'VENCIDO') return true
  if (ticket.sla_vencido === true) return true
  if (estadoSla === 'RESUELTO_EN_TIEMPO') return false

  const slaHours =
    ticket.horas_sla && ticket.horas_sla > 0
      ? ticket.horas_sla
      : ticket.prioridad?.Hora_sla ?? (ticket.prioridad as any)?.hora_sla
  if (!slaHours || slaHours <= 0) return false

  const created = new Date(ticket.created_at).getTime()
  const closedAt = new Date(ticket.fecha_resolucion ?? ticket.fecha_confirmacion_cierre ?? ticket.updated_at).getTime()
  if (isNaN(created) || isNaN(closedAt)) return false

  const pausedMs = (ticket.tiempo_acumulado_pausa_minutos ?? 0) * 60 * 1000
  const slaMs = (slaHours * 60 * 60 * 1000) + pausedMs
  return closedAt - created > slaMs
}

export function isTicketVencido(
  ticket: Pick<
    Ticket,
    | 'estado'
    | 'created_at'
    | 'prioridad'
    | 'sla_vencido'
    | 'fecha_limite_sla'
    | 'estado_sla'
    | 'tiempo_acumulado_pausa_minutos'
    | 'fecha_pausa_sla'
    | 'horas_sla'
  >
): boolean {
  const estadoSla = normalizeSlaEstado(ticket.estado_sla)
  if (estadoSla === 'RESUELTO_VENCIDO') return true
  if (estadoSla === 'VENCIDO') return true
  if (estadoSla === 'PAUSADO') return false

  if (!ESTADOS_ABIERTOS.has(ticket.estado)) return false

  if (ticket.sla_vencido === true) return true

  const slaHours = ticket.horas_sla ?? ticket.prioridad?.Hora_sla ?? (ticket.prioridad as any)?.hora_sla
  if (!slaHours || slaHours <= 0) return false

  const created = new Date(ticket.created_at).getTime()
  if (isNaN(created)) return false

  let totalPausedMs = (ticket.tiempo_acumulado_pausa_minutos ?? 0) * 60 * 1000
  if (ticket.fecha_pausa_sla) {
    const pauseStart = new Date(ticket.fecha_pausa_sla).getTime()
    if (!isNaN(pauseStart)) {
      totalPausedMs += Date.now() - pauseStart
    }
  }

  const slaMs = (slaHours * 60 * 60 * 1000) + totalPausedMs
  const elapsedMs = Date.now() - created
  return elapsedMs > slaMs
}

/**
 * Corrige la información SLA para tickets resueltos/cerrados.
 * El backend puede devolver `sla_vencido: true` si calcula contra
 * Date.now() en vez de contra la fecha real de resolución.
 * Esta función recalcula usando la fecha de resolución real.
 * Como fallback usa updated_at cuando fecha_resolucion no está disponible.
 */
export function corregirSlaInfoResuelto(
  ticket: Pick<Ticket, 'estado' | 'created_at' | 'fecha_resolucion' | 'updated_at' | 'prioridad'>,
  slaInfo: TicketSlaInfo | null
): TicketSlaInfo | null {
  if (!slaInfo) return null

  function calcularPausaTotal(info: TicketSlaInfo): number {
    let minutos = info.tiempo_acumulado_pausa_minutos || 0
    if (info.fecha_pausa_sla) {
      const pauseStart = new Date(info.fecha_pausa_sla).getTime()
      if (!isNaN(pauseStart)) {
        minutos += (Date.now() - pauseStart) / (60 * 1000)
      }
    }
    return minutos
  }

  // For resolved/closed tickets, recalculate based on actual resolution time
  if (ticket.estado === 'RESUELTO' || ticket.estado === 'CERRADO') {
    const resolutionTime = ticket.fecha_resolucion ?? ticket.updated_at
    if (!resolutionTime) return slaInfo

    const created = new Date(ticket.created_at).getTime()
    const resolved = new Date(resolutionTime).getTime()
    if (isNaN(created) || isNaN(resolved)) return slaInfo

    const slaHours = ticket.prioridad?.Hora_sla ?? (ticket.prioridad as any)?.hora_sla ?? slaInfo.horas_sla
    if (slaHours <= 0) return slaInfo

    const pausedMinutes = slaInfo.tiempo_acumulado_pausa_minutos || 0
    const effectiveSlaMs = (slaHours * 60 * 60 * 1000) + (pausedMinutes * 60 * 1000)
    const timeToResolveMs = resolved - created

    if (timeToResolveMs <= effectiveSlaMs) {
      return {
        ...slaInfo,
        estado_sla: 'Resuelto En Tiempo',
        sla_vencido: false,
        tiempo_vencido_mins: 0,
      }
    } else {
      return {
        ...slaInfo,
        estado_sla: 'Resuelto Vencido',
        sla_vencido: true,
        tiempo_vencido_mins: Math.round((timeToResolveMs - effectiveSlaMs) / (60 * 1000)),
      }
    }
  }

  // For open tickets, verify client-side if SLA has been exceeded
  if (ESTADOS_ABIERTOS.has(ticket.estado)) {
    if (slaInfo.sla_vencido || normalizeSlaEstado(slaInfo.estado_sla) === 'VENCIDO') return slaInfo
    if (normalizeSlaEstado(slaInfo.estado_sla) === 'PAUSADO') return slaInfo

    const slaHours = ticket.prioridad?.Hora_sla ?? (ticket.prioridad as any)?.hora_sla ?? slaInfo.horas_sla
    if (!slaHours || slaHours <= 0) return slaInfo

    const created = new Date(ticket.created_at).getTime()
    if (isNaN(created)) return slaInfo

    const pausedMinutes = calcularPausaTotal(slaInfo)
    const effectiveDeadline = created + (slaHours * 60 * 60 * 1000) + (pausedMinutes * 60 * 1000)

    if (Date.now() > effectiveDeadline) {
      return {
        ...slaInfo,
        estado_sla: 'Vencido',
        sla_vencido: true,
        minutos_restantes: 0,
        tiempo_vencido_mins: Math.round((Date.now() - effectiveDeadline) / (60 * 1000)),
      }
    }
  }

  return slaInfo
}
