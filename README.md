# Gestor-tks-IT

Sistema de gestión de tickets para mesa de ayuda TI desarrollado con **Next.js 16**, **React 19**, **TypeScript** y **Tailwind CSS v4**.

## Tecnologías

| Categoría | Tecnologías |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Lenguaje** | TypeScript 5 (strict mode) |
| **Estilos** | Tailwind CSS v4, shadcn/ui (New York style) |
| **Autenticación** | JWT con cookie + localStorage |
| **Tiempo real** | SignalR (Microsoft) |
| **HTTP** | Axios, SWR |
| **Formularios** | React Hook Form + Zod |
| **Gráficos** | Recharts |
| **Notificaciones** | Sonner |
| **Fecha** | date-fns |
| **Iconos** | Lucide React |
| **Paquete** | pnpm |

## Arquitectura

- **Frontend:** Next.js con App Router (`app/`) y componentes servidor/cliente
- **Backend:** API .NET (configurado via `NEXT_PUBLIC_API_URL`)
- **Tiempo real:** SignalR hub en `/hubs/ticket`
- **Roles:** `ADMIN`, `AGENTE_TI`, `USUARIO`

## Requisitos

- Node.js 20+
- pnpm (recomendado), npm o yarn

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd Gestor-tks-IT

# Instalar dependencias
pnpm install
```

## Configuración

Crear archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_API_URL=http://localhost:5214/api
```

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia servidor de desarrollo en `http://localhost:3000` |
| `pnpm build` | Genera build de producción |
| `pnpm start` | Inicia servidor de producción |
| `pnpm lint` | Ejecuta linter (ESLint) |

## Desarrollo

```bash
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## Estructura

```
app/          # Páginas (App Router)
components/   # Componentes React (ui/, formularios, layout)
lib/          # Lógica (API, contexto, stores, tipos)
hooks/        # Custom hooks
public/       # Archivos estáticos
```

## Paleta corporativa

- Púrpura: `#552373`
- Magenta: `#B80E80`
- Azul oscuro: `#263D77`
- Teal: `#009BAA`

---

