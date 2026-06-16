'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AuthLayout } from '@/components/auth-layout'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react'
import { solicitarRestablecimiento } from '@/lib/api/authService'

export default function OlvidoContrasenaPage() {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await solicitarRestablecimiento({ Correo: correo })
      setSuccess(true)
    } catch {
      setError('No se pudo procesar la solicitud. Verifique que el correo esté registrado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Olvidó su contraseña</CardTitle>
          <CardDescription>
            Ingrese su correo electrónico y le enviaremos las instrucciones para restablecer su contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert variant="default" className="border-green-500 text-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Si el correo está registrado, recibirá un enlace para restablecer su contraseña en los próximos minutos.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
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
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@tu-dominio.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar instrucciones
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
    </AuthLayout>
  )
}
