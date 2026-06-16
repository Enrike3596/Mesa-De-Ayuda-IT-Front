// Database Entity Types based on ER Model

export type RoleName = 'ADMIN' | 'AGENTE_TI' | 'USUARIO'

export interface Rol {
  id: number
  nombre: RoleName
  descripcion: string
}

export interface Area {
  Id: number
  NombreArea: string
  Estado: boolean
}

export interface Usuario {
  Id: number
  RolId: number
  AreaId: number
  Nombre: string
  Correo: string
  Telefono: string
  ContrasenaHash: string
  Estado: boolean
  FechaCreacion: string
  FechaModificacion: string
  // Joined fields
  rol?: Rol
  area?: Area
}

export interface Categoria {
  Id: number
  AreaId: number
  Nombre: string
  Descripcion: string
  Estado: boolean
}

export interface Subcategoria {
  Id: number
  CategoriaId: number
  NombreSubcategoria: string
  Descripcion: string
  Estado: boolean
}

export interface Prioridad {
  Id: number
  Nombre: string
  Tipo: string
  Hora_sla: number
  Estado: boolean
}

export type TicketEstado = 'ABIERTO' | 'EN_PROCESO' | 'EN_ESPERA' | 'PROGRAMADO' | 'PENDIENTE_CONFIRMACION' | 'REABIERTO' | 'CERRADO' | 'RESUELTO'

export interface Ticket {
  id: number
  titulo: string
  descripcion: string
  estado: TicketEstado
  usuario_id: number
  categoria_id: number
  subcategoria_id: number | null
  prioridad_id: number
  area_id: number
  created_at: string
  updated_at: string
  fecha_resolucion: string | null
  // Confirmación de cierre
  fecha_solicitud_cierre?: string | null
  fecha_confirmacion_cierre?: string | null
  motivo_rechazo?: string | null
  cerrado_por_usuario_id?: number | null
  // SLA
  fecha_limite_sla?: string | null
  estado_sla?: string | null
  sla_vencido?: boolean
  fecha_pausa_sla?: string | null
  tiempo_acumulado_pausa_minutos?: number
  horas_sla?: number
  // Joined fields
  usuario?: Usuario
  categoria?: Categoria
  subcategoria?: Subcategoria
  prioridad?: Prioridad
  asignado?: TicketAsignado
  comentarios?: TicketComentario[]
}

export interface TicketAsignado {
  id: number
  ticket_id: number
  agente_id: number
  asignado_en: string
  // Joined fields
  agente?: Usuario
}

export interface TicketComentario {
  id: number
  ticket_id: number
  usuario_id: number
  comentario: string
  es_interno: boolean
  created_at: string
  // Joined fields
  usuario?: Usuario
}

// Auth types
export interface AuthUser {
  id: number
  nombre: string
  email: string
  rol: RoleName
  area: string
}

export interface Session {
  user: AuthUser
  isAuthenticated: boolean
}

// Dashboard statistics
export interface DashboardStats {
  totalTickets: number
  ticketsAbiertos: number
  ticketsEnProgreso: number
  ticketsPendientes: number
  ticketsResueltos: number
  ticketsCerrados: number
  ticketsHoy: number
  ticketsVencidos: number
  tiempoPromedioResolucion: number // in hours
  ticketsPorSLA: {
    cumplidos: number
    incumplidos: number
  }
}

export interface TicketsPorCategoria {
  categoria: string
  count: number
}

export interface TicketsPorDia {
  fecha: string
  abiertos: number
  resueltos: number
}

// Notification types
export interface Notification {
  id: number
  tipo: 'TICKET_CREADO' | 'TICKET_ASIGNADO' | 'TICKET_ACTUALIZADO' | 'COMENTARIO_NUEVO'
  mensaje: string
  ticket_id: number
  leida: boolean
  created_at: string
}

// Form types
export interface CreateTicketForm {
  titulo: string
  descripcion: string
  categoria_id: number
  subcategoria_id: number | null
  prioridad_id: number
  usuario_id: number
  area_id: number
}

export interface SolicitudCierrePayload {
  ResumenSolucion: string
}

export interface ConfirmacionCierrePayload {
  Aceptado: boolean
  MotivoRechazo?: string
}

export interface TicketSlaInfo {
  id: number
  fecha_limite_sla: string | null
  estado_sla: string | null
  sla_vencido: boolean
  minutos_restantes: number
  tiempo_vencido_mins: number
  prioridad: string | null
  horas_sla: number
  fecha_pausa_sla: string | null
  tiempo_acumulado_pausa_minutos: number
}

export interface UpdateTicketForm {
  titulo?: string
  descripcion?: string
  estado?: TicketEstado
  categoria_id?: number
  subcategoria_id?: number | null
  prioridad_id?: number
  usuario_id?: number
  area_id?: number
}

export interface CreateCommentForm {
  comentario: string
  es_interno: boolean
  usuario_id?: number
}

export interface CreateUserForm {
  RolId: number
  AreaId: number
  Nombre: string
  Correo: string
  Telefono: string
  ContrasenaHash: string
  Estado: boolean
}

export interface TkAnexo {
  Id: number
  NombreArchivo: string
  TipoArchivo: string
  TamanoArchivo: number
  UrlArchivo: string
  FechaCarga: string
  UsuarioId: number
  TicketId: number
  Estado: string
}

export interface CreateTicketFormWithFiles extends CreateTicketForm {
  archivos?: File[]
}
