'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'
import { Loader2, AlertCircle } from 'lucide-react'

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [correo, setEmail] = useState('')
  const [ContrasenaHash, setContraseñaHash] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(correo, ContrasenaHash)
    
    if (!success) {
      setError('Credenciales incorrectas. Intente de nuevo.')
      setLoading(false)
    } else {
      // Pequeño delay para asegurar que el estado del AuthContext se actualice
      setTimeout(() => {
        router.push('/dashboard')
        // Remover router.refresh() que puede causar inconsistencias
      }, 100)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex w-full max-w-sm flex-col items-center gap-2">
        <div className="relative w-full" style={{ aspectRatio: '4 / 1' }}>
          <Image
            src="/Logo INDIGO ORG. 2.png"
            alt="Logo INDIGO ORG"
            fill
            priority
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Mesa de Ayuda TI</h1>
        <p className="text-sm text-muted-foreground">Sistema de gestión de tickets</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/olvido-contrasena"
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  ¿Olvidó su contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={ContrasenaHash}
                onChange={(e) => setContraseñaHash(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
