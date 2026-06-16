'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
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
      <div className="w-full max-w-sm space-y-4">
        {children}
      </div>
    </div>
  )
}
