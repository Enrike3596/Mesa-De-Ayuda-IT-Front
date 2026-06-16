import axios from 'axios';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEq = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (cookie.startsWith(nameEq)) return decodeURIComponent(cookie.slice(nameEq.length));
  }
  return null;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5214/api', // tu backend .NET
});

// Interceptor: agrega el token JWT a cada request automáticamente
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getCookie('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor: maneja errores globales de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      // No redirigir en login fallido para que el formulario muestre el error
      if (!isLoginRequest && typeof window !== 'undefined') {
        deleteCookie('token');
        window.localStorage.removeItem('auth_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;