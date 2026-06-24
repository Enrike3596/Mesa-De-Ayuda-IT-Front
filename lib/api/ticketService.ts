import api from './axiosConfig'

import type {
	ConfirmacionCierrePayload,
	CreateCommentForm,
	CreateTicketForm,
	SolicitudCierrePayload,
	Ticket,
	TicketAsignado,
	TicketComentario,
	TicketEstado,
	TicketSlaInfo,
	UpdateTicketForm,
} from '@/lib/types'

const BASE = '/ticket'

function pickNumber(...values: any[]): number {
	for (const value of values) {
		const n = Number(value)
		if (Number.isFinite(n) && n > 0) return n
	}
	return 0
}

export function normalizeTicket(raw: any): Ticket {
	// Backend EF (según tu modelo):
	// - UsuarioCreadorId, CategoriaId, PrioridadId, FechaCreacion, FechaModificacion, FechaCierre
	// - Navegaciones: UsuarioCreador, Categoria, Prioridad
	// Pero el frontend espera snake_case/camel_case: usuario_id, categoria_id, prioridad_id, created_at, updated_at, fecha_resolucion
	const id = raw?.id ?? raw?.Id ?? 0

	const usuario_id =
		raw?.usuario_id ??
		raw?.UsuarioCreadorId ??
		raw?.usuarioCreadorId ??
		raw?.usuario_creador_id ??
		raw?.usuarioId ??
		0

	const categoria_id =
		raw?.categoria_id ?? raw?.CategoriaId ?? raw?.categoriaId ?? raw?.categoriaid ?? 0

	const subcategoria_id =
		raw?.subcategoria_id ??
		raw?.SubcategoriaId ??
		raw?.subcategoriaId ??
		raw?.subcategoriaid ??
		raw?.SubCategoriaId ??
		raw?.SubcategoriaID ??
		raw?.sub_categoria_id ??
		raw?.tkSubcategoriaId ??
		raw?.TkSubcategoriaId ??
		raw?.SubCatId ??
		raw?.subCatId ??
		raw?.SubcatId ??
		raw?.subcatId ??
		raw?.SubCategoryId ??
		raw?.subCategoryId ??
		raw?.SubCategoria_Id ??
		raw?.subCategoria_Id ??
		raw?.TkSubcategoriaId ??
		raw?.TKSubcategoriaId ??
		raw?.Subcategoria_id ??
		raw?.SUBCATEGORIAID ??
		raw?.SubcategoriaID ??
		raw?.subcategoria_ID ??
		raw?.Subcategoria ??
		raw?.subcategoria ??
		raw?.SubcategoriaNavigation ??
		0

	const prioridad_id =
		raw?.prioridad_id ?? raw?.PrioridadId ?? raw?.prioridadId ?? raw?.prioridadid ?? 0

	const area_id = raw?.area_id ?? raw?.AreaId ?? raw?.areaId ?? raw?.areaid ?? 0

	const tipo_ticket_id =
		raw?.tipo_ticket_id ??
		raw?.TipoTicketId ??
		raw?.tipoTicketId ??
		raw?.tktipoticket_id ??
		raw?.TkTipoTicketId ??
		0

	const estadoRaw = raw?.estado ?? raw?.Estado ?? raw?.estadoTicket ?? raw?.EstadoTicket
	const estadoNormalized =
		typeof estadoRaw === 'string'
			? estadoRaw
					.trim()
					.toUpperCase()
					.replace(/-/g, '_')
					.replace(/\s+/g, '_')
			: ''
	const estadoMap: Record<string, TicketEstado> = {
		ABIERTO: 'ABIERTO',
		EN_PROCESO: 'EN_PROCESO',
		EN_ESPERA: 'EN_ESPERA',
		PROGRAMADO: 'PROGRAMADO',
		PENDIENTE_CONFIRMACION: 'PENDIENTE_CONFIRMACION',
		REABIERTO: 'REABIERTO',
		CERRADO: 'CERRADO',
		RESUELTO: 'RESUELTO',
	}
	const estado = estadoMap[estadoNormalized] ?? 'ABIERTO'

	return {
		id,
		titulo: raw?.titulo ?? raw?.Titulo ?? '',
		descripcion: raw?.descripcion ?? raw?.Descripcion ?? '',
		estado,

		usuario_id,
		categoria_id,
		subcategoria_id: subcategoria_id || null,
		prioridad_id,
		area_id,
		tipo_ticket_id: tipo_ticket_id || undefined,

		created_at: raw?.created_at ?? raw?.FechaCreacion ?? raw?.fechaCreacion ?? raw?.createdAt ?? '',
		updated_at: raw?.updated_at ?? raw?.FechaModificacion ?? raw?.updatedAt ?? raw?.FechaModificacion ?? '',
		fecha_resolucion:
			raw?.fecha_resolucion ?? raw?.FechaCierre ?? raw?.fechaCierre ?? raw?.fecha_cierre ?? null,
		fecha_solicitud_cierre:
			raw?.fecha_solicitud_cierre ?? raw?.FechaSolicitudCierre ?? raw?.fechaSolicitudCierre ?? null,
		fecha_confirmacion_cierre:
			raw?.fecha_confirmacion_cierre ?? raw?.FechaConfirmacionCierre ?? raw?.fechaConfirmacionCierre ?? null,
		motivo_rechazo:
			raw?.motivo_rechazo ?? raw?.MotivoRechazo ?? raw?.motivoRechazo ?? null,
		cerrado_por_usuario_id:
			raw?.cerrado_por_usuario_id ?? raw?.CerradoPorUsuarioId ?? raw?.cerradoPorUsuarioId ?? null,

		// SLA
		fecha_limite_sla:
			raw?.FechaLimiteSLA ?? raw?.FechaLimiteSla ?? raw?.fechaLimiteSLA ?? raw?.fechaLimiteSla ?? raw?.fecha_limite_sla ?? null,
		estado_sla: raw?.EstadoSLA ?? raw?.EstadoSla ?? raw?.estadoSLA ?? raw?.estadoSla ?? raw?.estado_sla ?? null,
		sla_vencido: Boolean(raw?.SLAVencido ?? raw?.SlaVencido ?? raw?.slaVencido ?? raw?.sla_vencido ?? false),
		fecha_pausa_sla: raw?.FechaPausaSLA ?? raw?.FechaPausaSla ?? raw?.fechaPausaSLA ?? raw?.fechaPausaSla ?? raw?.fecha_pausa_sla ?? null,
		tiempo_acumulado_pausa_minutos:
			Number(
				raw?.TiempoAcumuladoPausaMinutos ??
					raw?.tiempoAcumuladoPausaMinutos ??
					raw?.tiempo_acumulado_pausa_minutos ??
					0,
			) || 0,
		horas_sla: Number(raw?.HorasSLA ?? raw?.HorasSla ?? raw?.horasSLA ?? raw?.horasSla ?? raw?.horas_sla ?? 0) || 0,

		usuario:
			raw?.usuario ??
			raw?.Usuario ??
			raw?.UsuarioCreador ??
			raw?.usuarioCreador ??
			raw?.usuario_creador ??
			undefined,
		categoria: raw?.categoria ?? raw?.Categoria ?? raw?.categoriaTicket ?? undefined,
		subcategoria: raw?.subcategoria ?? raw?.Subcategoria ?? undefined,
		prioridad: raw?.prioridad ?? raw?.Prioridad ?? raw?.prioridadTicket ?? undefined,

		asignado: (() => {
			const arr = raw?.asignados ?? raw?.TkAsignados ?? raw?.ticket_asignados ?? raw?.TkAsignadosCargados
			return Array.isArray(arr) && arr.length > 0 ? normalizeAsignado(arr[arr.length - 1]) : undefined
		})(),
		comentarios:
			raw?.comentarios ?? raw?.TkComentarios ?? raw?.ticket_comentarios ?? raw?.TkComentariosCargados ?? undefined,
	}
}


function toTicketCreatePayload(dto: CreateTicketForm): Record<string, unknown> {
	return {
		Titulo: dto.titulo,
		Descripcion: dto.descripcion,
		UsuarioId: dto.usuario_id,
		CategoriaId: dto.categoria_id,
		SubcategoriaId: dto.subcategoria_id && dto.subcategoria_id > 0 ? dto.subcategoria_id : null,
		PrioridadId: dto.prioridad_id,
		AreaId: dto.area_id,
		TipoTicketId: dto.tipo_ticket_id,
	}
}

function toTicketUpdatePayload(dto: UpdateTicketForm): Record<string, unknown> {
	const payload: Record<string, unknown> = {}
	if (dto.titulo !== undefined) {
		payload.titulo = dto.titulo
		payload.Titulo = dto.titulo
	}
	if (dto.descripcion !== undefined) {
		payload.descripcion = dto.descripcion
		payload.Descripcion = dto.descripcion
	}
	if (dto.estado !== undefined) {
		payload.estado = dto.estado
		payload.Estado = dto.estado
	}
	if (dto.categoria_id !== undefined) {
		payload.categoria_id = dto.categoria_id
		payload.CategoriaId = dto.categoria_id
	}
	if (dto.subcategoria_id !== undefined) {
		payload.subcategoria_id = dto.subcategoria_id
		payload.SubcategoriaId = dto.subcategoria_id
	}
	if (dto.prioridad_id !== undefined) {
		payload.prioridad_id = dto.prioridad_id
		payload.PrioridadId = dto.prioridad_id
	}
	if (dto.usuario_id !== undefined) {
		payload.usuario_id = dto.usuario_id
		payload.UsuarioId = dto.usuario_id
	}
	if (dto.area_id !== undefined) {
		payload.area_id = dto.area_id
		payload.AreaId = dto.area_id
	}
	if (dto.tipo_ticket_id !== undefined) {
		payload.tipo_ticket_id = dto.tipo_ticket_id
		payload.TipoTicketId = dto.tipo_ticket_id
	}
	return payload
}

export async function listarTickets(): Promise<Ticket[]> {
	const response = await api.get<any>(BASE)
	const data = response.data
	const tickets = (Array.isArray(data) ? data : []).map(normalizeTicket)
	return Promise.all(
		tickets.map((ticket) =>
			ticket.estado === 'CERRADO' || ticket.estado === 'RESUELTO'
				? obtenerTicketPorId(ticket.id).catch(() => enrichTicketWithSla(ticket))
				: ticket,
		),
	)
}

export async function obtenerTicketPorId(id: number): Promise<Ticket> {
	const response = await api.get<any>(`${BASE}/${id}`)
	return enrichTicketWithSla(normalizeTicket(response.data))
}

function normalizeTicketSla(raw: any): TicketSlaInfo {
	return {
		id: raw?.Id ?? raw?.id ?? 0,
		fecha_limite_sla:
			raw?.FechaLimiteSLA ?? raw?.FechaLimiteSla ?? raw?.fechaLimiteSLA ?? raw?.fechaLimiteSla ?? raw?.fecha_limite_sla ?? raw?.fechaLimite ?? null,
		estado_sla: raw?.EstadoSLA ?? raw?.EstadoSla ?? raw?.estadoSLA ?? raw?.estadoSla ?? raw?.estado_sla ?? null,
		sla_vencido: Boolean(raw?.SLAVencido ?? raw?.SlaVencido ?? raw?.slaVencido ?? raw?.sla_vencido ?? false),
		minutos_restantes: Number(raw?.MinutosRestantes ?? raw?.minutosRestantes ?? raw?.minutos_restantes ?? 0) || 0,
		tiempo_vencido_mins:
			Number(raw?.TiempoVencidoMins ?? raw?.tiempoVencidoMins ?? raw?.tiempo_vencido_mins ?? 0) || 0,
		prioridad: raw?.Prioridad ?? raw?.prioridad ?? null,
		horas_sla: Number(raw?.HorasSLA ?? raw?.HorasSla ?? raw?.horasSLA ?? raw?.horasSla ?? raw?.horas_sla ?? 0) || 0,
		fecha_pausa_sla: raw?.FechaPausaSLA ?? raw?.FechaPausaSla ?? raw?.fechaPausaSLA ?? raw?.fechaPausaSla ?? raw?.fecha_pausa_sla ?? null,
		tiempo_acumulado_pausa_minutos:
			Number(
				raw?.TiempoAcumuladoPausaMinutos ??
					raw?.tiempoAcumuladoPausaMinutos ??
					raw?.tiempo_acumulado_pausa_minutos ??
					0,
			) || 0,
	}
}

export async function obtenerSlaPorTicket(ticketId: number): Promise<TicketSlaInfo | null> {
	const candidates = [`${BASE}/${ticketId}/sla`, `${BASE}/sla/${ticketId}`, `${BASE}/${ticketId}/SLA`]
	for (const url of candidates) {
		try {
			const res = await api.get<any>(url)
			return normalizeTicketSla(res.data)
		} catch {
			// try next
		}
	}
	return null
}

export async function enrichTicketWithSla(ticket: Ticket): Promise<Ticket> {
	if (!ticket.id || (ticket.estado !== 'CERRADO' && ticket.estado !== 'RESUELTO')) return ticket

	const sla = await obtenerSlaPorTicket(ticket.id)
	if (!sla) return ticket

	return {
		...ticket,
		fecha_limite_sla: sla.fecha_limite_sla ?? ticket.fecha_limite_sla,
		estado_sla: sla.estado_sla ?? ticket.estado_sla,
		sla_vencido: sla.sla_vencido,
		fecha_pausa_sla: sla.fecha_pausa_sla ?? ticket.fecha_pausa_sla,
		tiempo_acumulado_pausa_minutos:
			sla.tiempo_acumulado_pausa_minutos ?? ticket.tiempo_acumulado_pausa_minutos,
		horas_sla: sla.horas_sla > 0 ? sla.horas_sla : ticket.horas_sla,
	}
}

export async function crearTicket(dto: CreateTicketForm): Promise<Ticket> {
	const response = await api.post<any>(BASE, toTicketCreatePayload(dto))
	const created = normalizeTicket(response.data)

	if (created.id) {
		try {
			const detailedResponse = await api.get<any>(`${BASE}/${created.id}`)
			return normalizeTicket(detailedResponse.data)
		} catch {
			return created
		}
	}

	return created
}

function normalizeAsignado(raw: any): TicketAsignado {
	const agenteObj = raw?.agente ?? raw?.Agente ?? raw?.usuario ?? raw?.Usuario
	const agenteId = pickNumber(
		raw?.agente_id,
		raw?.AgenteId,
		raw?.agenteId,
		raw?.usuario_id,
		raw?.UsuarioId,
		raw?.usuarioId,
		raw?.UsuarioAsignadoId,
		raw?.usuarioAsignadoId,
		raw?.AgenteTIId,
		raw?.agenteTIId,
		agenteObj?.Id,
		agenteObj?.id
	)

	return {
		id: raw?.id ?? raw?.Id ?? 0,
		ticket_id: pickNumber(raw?.ticket_id, raw?.TicketId, raw?.ticketId, raw?.TkTicketId, raw?.tkTicketId),
		agente_id: agenteId,
		asignado_en: raw?.asignado_en ?? raw?.AsignadoEn ?? raw?.created_at ?? raw?.FechaCreacion ?? '',
		agente: agenteObj,
	}
}

function normalizeComentario(raw: any): TicketComentario {
  const usuarioObj = raw?.usuario ?? raw?.Usuario ?? raw?.autor ?? raw?.Autor
  const esInternoRaw = raw?.es_interno ?? raw?.EsInterno ?? raw?.esInterno ?? raw?.interno ?? raw?.Interno ?? false
  const es_interno = typeof esInternoRaw === 'string'
    ? esInternoRaw.toLowerCase() === 'true' || esInternoRaw === '1'
    : Boolean(esInternoRaw)

  return {
    id: raw?.id ?? raw?.Id ?? 0,
    ticket_id: pickNumber(raw?.ticket_id, raw?.TicketId, raw?.ticketId, raw?.TkTicketId, raw?.tkTicketId),
    usuario_id: pickNumber(raw?.usuario_id, raw?.UsuarioId, raw?.usuarioId, raw?.AutorId, raw?.autorId, usuarioObj?.Id, usuarioObj?.id),
    comentario: raw?.comentario ?? raw?.Comentario ?? raw?.contenido ?? raw?.descripcion ?? '',
    es_interno,
    created_at: raw?.created_at ?? raw?.FechaCreacion ?? raw?.createdAt ?? '',
    usuario: usuarioObj,
  }
}

export async function actualizarTicket(id: number, dto: UpdateTicketForm): Promise<Ticket> {
	await api.put<any>(`${BASE}/${id}`, toTicketUpdatePayload(dto))
	const ticketResponse = await api.get<any>(`${BASE}/${id}`)
	return enrichTicketWithSla(normalizeTicket(ticketResponse.data))
}

export async function actualizarEstadoTicket(id: number, estado: TicketEstado): Promise<Ticket> {
	await api.put<any>(`${BASE}/${id}`, { estado, Estado: estado })
	const ticketResponse = await api.get<any>(`${BASE}/${id}`)
	return enrichTicketWithSla(normalizeTicket(ticketResponse.data))
}

export async function asignarTicket(id: number, agenteId: number): Promise<Ticket> {
	const existentes = await obtenerAsignadosPorTicket(id)
	for (const existente of existentes) {
		try {
			await api.delete<any>(`/TicketAsignado/${existente.id}`)
		} catch {
			// Intenta con ruta alternativa
			try { await api.delete<any>(`/TicketAsignado?id=${existente.id}`) } catch {}
		}
	}

	await api.post<any>('/TicketAsignado', {
		ticket_id: id,
		TicketId: id,
		agente_id: agenteId,
		AgenteId: agenteId,
		agenteId: agenteId,
		usuario_id: agenteId,
		UsuarioId: agenteId,
		usuarioId: agenteId,
	})
	const ticketResponse = await api.get<any>(`${BASE}/${id}`)
	return enrichTicketWithSla(normalizeTicket(ticketResponse.data))
}

export async function agregarComentarioTicket(
	id: number,
	dto: CreateCommentForm
): Promise<Ticket> {
	await api.post<any>('/TicketComentario', {
		ticket_id: id,
		TicketId: id,
		comentario: dto.comentario,
		Comentario: dto.comentario,
		usuario_id: dto.usuario_id,
		UsuarioId: dto.usuario_id,
		es_interno: dto.es_interno,
		EsInterno: dto.es_interno,
	})
	const ticketResponse = await api.get<any>(`${BASE}/${id}`)
	return enrichTicketWithSla(normalizeTicket(ticketResponse.data))
}

export async function obtenerAsignadosPorTicket(ticketId: number): Promise<TicketAsignado[]> {
	const response = await api.get<any>('/TicketAsignado')
	const data = Array.isArray(response.data) ? response.data : []
	return data.map(normalizeAsignado).filter((a) => a.ticket_id === ticketId)
}

export async function obtenerAsignados(): Promise<TicketAsignado[]> {
	const response = await api.get<any>('/TicketAsignado')
	const data = Array.isArray(response.data) ? response.data : []
	return data.map(normalizeAsignado)
}

export async function obtenerComentariosPorTicket(ticketId: number): Promise<TicketComentario[]> {
	const response = await api.get<any>('/TicketComentario')
	const data = Array.isArray(response.data) ? response.data : []
	return data.map(normalizeComentario).filter((c) => c.ticket_id === ticketId)
}

export async function solicitarCierre(ticketId: number, dto: SolicitudCierrePayload): Promise<Ticket> {
	await api.put<any>(`${BASE}/${ticketId}/solicitar-cierre`, dto)
	const ticketResponse = await api.get<any>(`${BASE}/${ticketId}`)
	return enrichTicketWithSla(normalizeTicket(ticketResponse.data))
}

export async function confirmarCierre(ticketId: number, dto: ConfirmacionCierrePayload): Promise<Ticket> {
	await api.put<any>(`${BASE}/${ticketId}/confirmar-cierre`, dto)
	const ticketResponse = await api.get<any>(`${BASE}/${ticketId}`)
	return enrichTicketWithSla(normalizeTicket(ticketResponse.data))
}

export async function pendientesConfirmacion(): Promise<Ticket[]> {
	const response = await api.get<any>(`${BASE}/pendientes-confirmacion`)
	const data = response.data
	return (Array.isArray(data) ? data : []).map(normalizeTicket)
}
