'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthLayout } from '@/components/auth-layout'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Lock } from 'lucide-react'
import { restablecerContrasena } from '@/lib/api/authService'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (nuevaContrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (!token) {
      setError('El enlace de restablecimiento no es válido o ha expirado.')
      return
    }

    setLoading(true)

    try {
      await restablecerContrasena({ Token: token, NuevaContrasena: nuevaContrasena })
      setSuccess(true)
    } catch {
      setError('No se pudo restablecer la contraseña. El enlace puede haber expirado o ser inválido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Restablecer contraseña</CardTitle>
        <CardDescription>
          Ingrese su nueva contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <Alert variant="default" className="border-green-500 text-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Su contraseña ha sido restablecida exitosamente.
              </AlertDescription>
            </Alert>
            <Button className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir al inicio de sesión
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="********"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="********"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restableciendo...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Restablecer contraseña
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:text-primary hover:underline">
                <ArrowLeft className="mr-1 inline-block h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function RestablecerContrasenaPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  )
}
