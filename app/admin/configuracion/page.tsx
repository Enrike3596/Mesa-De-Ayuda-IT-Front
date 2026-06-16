'use client'

import { useAuth } from '@/lib/context/AuthContext'
import { LoginForm } from '@/components/login-form'
import { AppShell } from '@/components/app-shell'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Settings, Bell, Mail, Shield, Database } from 'lucide-react'

export default function AdminConfigPage() {
  const { session, isAdmin } = useAuth()

  if (!session.isAuthenticated) {
    return <LoginForm />
  }

  if (!isAdmin) {
    redirect('/dashboard')
  }

  const handleSave = () => {
    toast.success('Configuración guardada', {
      description: 'Los cambios han sido aplicados correctamente',
    })
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">
            Ajustes generales del sistema
          </p>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Configuración General</CardTitle>
              </div>
              <CardDescription>
                Ajustes básicos del sistema de tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Nombre de la empresa</Label>
                <Input id="company" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <Input id="timezone" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Modo mantenimiento</Label>
                  <p className="text-sm text-muted-foreground">
                    Desactiva el acceso de usuarios no administradores
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Notificaciones</CardTitle>
              </div>
              <CardDescription>
                Configure las notificaciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar emails cuando se creen o actualicen tickets
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificaciones en tiempo real</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar notificaciones dentro de la aplicación
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Resumen diario</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar resumen de tickets pendientes cada día
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Correo Electrónico</CardTitle>
              </div>
              <CardDescription>
                Configuración del servidor de correo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Servidor SMTP</Label>
                  <Input id="smtp-host" placeholder="smtp.ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Puerto</Label>
                  <Input id="smtp-port" placeholder="587" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuario</Label>
                  <Input id="smtp-user" placeholder="usuario@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-pass">Contraseña</Label>
                  <Input id="smtp-pass" type="password" placeholder="********" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">Correo remitente</Label>
                <Input id="from-email" placeholder="soporte@tu-dominio.com" />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Seguridad</CardTitle>
              </div>
              <CardDescription>
                Ajustes de seguridad y acceso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Autenticación de dos factores</Label>
                  <p className="text-sm text-muted-foreground">
                    Requerir 2FA para todos los usuarios
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Tiempo de sesión (minutos)</Label>
                <Input id="session-timeout" type="number" className="max-w-37.5" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Bloqueo por intentos fallidos</Label>
                  <p className="text-sm text-muted-foreground">
                    Bloquear cuenta después de 5 intentos fallidos
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Database Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Base de Datos</CardTitle>
              </div>
              <CardDescription>
                Información de la conexión a base de datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Estado:</strong> No disponible
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Para conectar una base de datos Amazon Aurora PostgreSQL, configure
                  la integración desde el panel de Vercel.
                </p>
              </div>
              <Button variant="outline" disabled>
                Configurar Base de Datos
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave}>Guardar Cambios</Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
