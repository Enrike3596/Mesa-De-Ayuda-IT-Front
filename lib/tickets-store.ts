import { useState, useEffect } from 'react'
import type { Ticket, TicketEstado, CreateTicketForm, CreateCommentForm, UpdateTicketForm, SolicitudCierrePayload, ConfirmacionCierrePayload } from './types'
import {
  listarTickets,
  crearTicket as crearTicketApi,
  actualizarTicket as actualizarTicketApi,
  asignarTicket as asignarTicketApi,
  agregarComentarioTicket as agregarComentarioTicketApi,
  solicitarCierre as solicitarCierreApi,
  confirmarCierre as confirmarCierreApi,
} from './api/ticketService'
import { subirAnexo } from './api/anexoService'

interface TicketsState {
  tickets: Ticket[]
  loadTickets: () => Promise<void>
  addTicket: (form: CreateTicketForm, archivos?: File[]) => Promise<{ ticket: Ticket, uploadErrors: number }>
  updateTicket: (id: number, updates: UpdateTicketForm) => Promise<Ticket>
  updateTicketStatus: (id: number, estado: TicketEstado) => Promise<Ticket>
  assignTicket: (ticketId: number, agenteId: number) => Promise<Ticket>
  addComment: (ticketId: number, form: CreateCommentForm) => Promise<Ticket>
  solicitarCierre: (ticketId: number, dto: SolicitudCierrePayload) => Promise<Ticket>
  confirmarCierre: (ticketId: number, dto: ConfirmacionCierrePayload) => Promise<Ticket>
  getTicketById: (id: number) => Ticket | undefined
  getTicketsByUser: (userId: number) => Ticket[]
  getTicketsByAgent: (agenteId: number) => Ticket[]
}

// Simple state management without zustand for now (using a singleton pattern)
let ticketsData: Ticket[] = []
let listeners: Set<() => void> = new Set()
let hasLoaded = false
let loadingPromise: Promise<void> | null = null

function deduplicate(tickets: Ticket[]): Ticket[] {
  const seen = new Set<number>()
  const result: Ticket[] = []
  for (const t of tickets) {
    if (!seen.has(t.id)) {
      seen.add(t.id)
      result.push(t)
    }
  }
  return result
}

export const ticketsStore = {
  getTickets: () => ticketsData,

  ensureLoaded: async () => {
    if (hasLoaded) return
    if (!loadingPromise) {
      loadingPromise = ticketsStore
        .loadTickets()
        .finally(() => {
          loadingPromise = null
        })
    }
    await loadingPromise
  },
  
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  
  notifyListeners: () => {
    listeners.forEach(listener => listener())
  },

  // SignalR: actualiza un ticket en el estado local sin llamar a la API
  updateTicketInState: (updatedTicket: Ticket) => {
    ticketsData = ticketsData.map(t => (t.id === updatedTicket.id ? updatedTicket : t))
    ticketsStore.notifyListeners()
  },

  // SignalR: agrega un nuevo ticket al estado local sin llamar a la API
  addTicketToState: (newTicket: Ticket) => {
    const exists = ticketsData.some(t => t.id === newTicket.id)
    if (exists) return
    ticketsData = [newTicket, ...ticketsData]
    ticketsStore.notifyListeners()
  },

  loadTickets: async (): Promise<void> => {
    const data = await listarTickets()
    ticketsData = deduplicate(Array.isArray(data) ? data : [])
    hasLoaded = true
    ticketsStore.notifyListeners()
  },

  getTicketById: (id: number): Ticket | undefined => {
    return ticketsData.find(t => t.id === id)
  },

  getTicketsByUser: (userId: number): Ticket[] => {
    return ticketsData.filter(t => t.usuario_id === userId)
  },

  getTicketsByAgent: (agenteId: number): Ticket[] => {
    return ticketsData.filter(t => 
      t.asignado?.agente_id === agenteId
    )
  },

  addTicket: async (form: CreateTicketForm, archivos?: File[]): Promise<{ ticket: Ticket, uploadErrors: number }> => {
    const created = await crearTicketApi(form)
    ticketsStore.addTicketToState(created)

    let uploadErrors = 0
    if (archivos && archivos.length > 0) {
      const usuarioId = created.usuario_id
      const results = await Promise.allSettled(
        archivos.map(file => subirAnexo(file, created.id, usuarioId))
      )
      uploadErrors = results.filter(r => r.status === 'rejected').length
      if (uploadErrors > 0) {
        console.warn(`Ticket #${created.id} creado, pero ${uploadErrors} archivo(s) no se pudieron subir.`)
      }
    }

    return { ticket: created, uploadErrors }
  },

  updateTicket: async (id: number, updates: UpdateTicketForm): Promise<Ticket> => {
    const updated = await actualizarTicketApi(id, updates)
    ticketsData = ticketsData.map(t => (t.id === id ? updated : t))
    ticketsStore.notifyListeners()
    return updated
  },

  updateTicketStatus: async (id: number, estado: TicketEstado): Promise<Ticket> => {
    const current = ticketsData.find(t => t.id === id)
    const updates: UpdateTicketForm = {
      estado,
      categoria_id: current?.categoria_id,
      subcategoria_id: current?.subcategoria_id,
      prioridad_id: current?.prioridad_id,
      area_id: current?.area_id,
    }
    const updated = await actualizarTicketApi(id, updates)
    ticketsData = ticketsData.map(t => (t.id === id ? updated : t))
    ticketsStore.notifyListeners()
    return updated
  },

  assignTicket: async (ticketId: number, agenteId: number): Promise<Ticket> => {
    const updated = await asignarTicketApi(ticketId, agenteId)
    ticketsData = ticketsData.map(t => (t.id === ticketId ? updated : t))
    ticketsStore.notifyListeners()
    return updated
  },

  addComment: async (ticketId: number, form: CreateCommentForm): Promise<Ticket> => {
    const updated = await agregarComentarioTicketApi(ticketId, form)
    ticketsData = ticketsData.map(t => (t.id === ticketId ? updated : t))
    ticketsStore.notifyListeners()
    return updated
  },

  solicitarCierre: async (ticketId: number, dto: SolicitudCierrePayload): Promise<Ticket> => {
    const updated = await solicitarCierreApi(ticketId, dto)
    ticketsData = ticketsData.map(t => (t.id === ticketId ? updated : t))
    ticketsStore.notifyListeners()
    return updated
  },

  confirmarCierre: async (ticketId: number, dto: ConfirmacionCierrePayload): Promise<Ticket> => {
    const updated = await confirmarCierreApi(ticketId, dto)
    ticketsData = ticketsData.map(t => (t.id === ticketId ? updated : t))
    ticketsStore.notifyListeners()
    return updated
  },
}

// Custom hook to use tickets with reactivity
export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>(ticketsStore.getTickets())
  
  useEffect(() => {
    ticketsStore.ensureLoaded().catch(() => {
      // Silently ignore: UI components handle empty state.
    })

    const unsubscribe = ticketsStore.subscribe(() => {
      setTickets([...ticketsStore.getTickets()])
    })
    return () => unsubscribe()
  }, [])
  
  return {
    tickets,
    ...ticketsStore,
  }
}
