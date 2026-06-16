import api from './axiosConfig';

export interface UsuarioResponse {
  id?: number;
  Id?: number;
  nombre?: string;
  Nombre?: string;
  correo?: string;
  Correo?: string;
  telefono?: string;
  Telefono?: string;
  estado?: string | boolean | number;
  Estado?: string | boolean | number;
  rol?: string;
  Rol?: string;
  area?: string;
  Area?: string;
  areaId?: number;
  AreaId?: number;
  rolId?: number;
  RolId?: number;
  fechaCreacion?: string;
  FechaCreacion?: string;
  createdAt?: string;
  CreatedAt?: string;
  fechaModificacion?: string;
  FechaModificacion?: string;
  updatedAt?: string;
  UpdatedAt?: string;
}

export interface UsuarioCreateDTO {
  nombre: string;
  correo: string;
  telefono: string;
  password: string;
  estado?: boolean;
  rolId: number;
  areaId: number;
}

export interface UsuarioUpdateDTO {
  nombre?: string;
  telefono?: string;
  password?: string;
  rolId?: number;
  areaId?: number;
  estado?: boolean | string;
}

type UsuarioCompatInput =
  | UsuarioCreateDTO
  | UsuarioUpdateDTO
  | {
      // PascalCase variant
      Nombre?: string;
      Correo?: string;
      Telefono?: string;
      ContrasenaHash?: string;
      Password?: string;
      RolId?: number;
      AreaId?: number;
      Estado?: boolean | string;

      // snake_case / alternate
      rol_id?: number;
      area_id?: number;
      contrasena?: string;
      contrasena_hash?: string;
    };

function toUsuarioApiPayload(input: UsuarioCompatInput): Record<string, unknown> {
  const raw: any = input

  // Backend DTO (UsuarioCreate/Update)
  // Create => Nombre, Correo, Telefono, ContrasenaHash, Estado?, RolId, AreaId
  // Update => Nombre?, Telefono?, Estado?

  const nombre = (raw?.Nombre ?? raw?.nombre ?? '').trim()
  const correo = (raw?.Correo ?? raw?.correo ?? '').trim()
  const telefono = (raw?.Telefono ?? raw?.telefono ?? '').trim()

  const rolId = raw?.RolId ?? raw?.rolId ?? raw?.rol_id
  const areaId = raw?.AreaId ?? raw?.areaId ?? raw?.area_id

const password = raw?.ContrasenaHash ?? raw?.contrasena_hash ?? raw?.contrasena ?? raw?.Password ?? raw?.password

 const estadoRaw = raw?.Estado ?? raw?.estado
  const estado =
    estadoRaw === undefined
      ? undefined
      : typeof estadoRaw === 'boolean'
        ? estadoRaw
        : typeof estadoRaw === 'string'
          ? estadoRaw.trim().toLowerCase() === 'true' || estadoRaw.trim().toLowerCase() === 'activo'
          : Boolean(estadoRaw)

  const payload: Record<string, unknown> = {}

  if (nombre) {
    payload.Nombre = nombre
  }

  if (correo) {
    payload.Correo = correo
  }

  if (telefono) {
    payload.Telefono = telefono
  }

  if (password !== undefined) {
    payload.ContrasenaHash = password
    payload.contrasenaHash = password
    payload.Contrasena = password
    payload.contrasena = password
  }

  if (estado !== undefined) {
    payload.Estado = estado
  }

  if (rolId !== undefined) {
    payload.RolId = rolId
  }

  if (areaId !== undefined) {
    payload.AreaId = areaId
  }

  // Compatibilidad mínima: agrega variantes sin depender del backend tolerante
  // (no elimina payloads previos para no romper Postman; solo garantizamos el mapeo DTO exacto)
  const compat: Record<string, unknown> = {}

  if (nombre) compat.nombre = nombre
  if (correo) compat.correo = correo
  if (telefono) compat.telefono = telefono
  if (rolId !== undefined) compat.rolId = rolId
  if (areaId !== undefined) compat.areaId = areaId

  return {
    ...payload,
    ...compat,
  }
}


export const obtenerUsuarios = async (): Promise<UsuarioResponse[]> => {
  const response = await api.get<UsuarioResponse[]>('/usuario');
  return response.data;
};

export const obtenerUsuarioPorId = async (id: number): Promise<UsuarioResponse> => {
  const response = await api.get<UsuarioResponse>(`/usuario/${id}`);
  return response.data;
};

export const crearUsuario = async (dto: UsuarioCreateDTO): Promise<UsuarioResponse> => {
  const response = await api.post<UsuarioResponse>('/usuario', toUsuarioApiPayload(dto));
  return response.data;
};

export const actualizarUsuario = async (id: number, dto: UsuarioUpdateDTO): Promise<UsuarioResponse> => {
  const response = await api.put<UsuarioResponse>(`/usuario/${id}`, toUsuarioApiPayload(dto));
  return response.data;
};

export const eliminarUsuario = async (id: number): Promise<void> => {
  await api.delete(`/usuario/${id}`);
};

export const obtenerUsuariosPorArea = async (areaId: number): Promise<UsuarioResponse[]> => {
  const response = await api.get<UsuarioResponse[]>(`/usuario/area/${areaId}`);
  return response.data;
};
