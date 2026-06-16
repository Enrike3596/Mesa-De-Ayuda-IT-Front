import api from './axiosConfig';

interface LoginDTO {
  Correo: string;
  ContrasenaHash: string;
}

interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    correo: string;
    rol: string;
  };
}

interface SolicitarRestablecimientoDTO {
  Correo: string;
}

interface RestablecerContrasenaDTO {
  Token: string;
  NuevaContrasena: string;
}

export const login = async (dto: LoginDTO): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', dto);
  return response.data;
};

export const solicitarRestablecimiento = async (dto: SolicitarRestablecimientoDTO): Promise<void> => {
  await api.post('/auth/solicitar-restablecimiento', dto);
};

export const restablecerContrasena = async (dto: RestablecerContrasenaDTO): Promise<void> => {
  await api.post('/auth/restablecer-contrasena', dto);
};

export const logout = () => {
  if (typeof document !== 'undefined') {
    document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax';
  }
};