'use client'

import * as signalR from '@microsoft/signalr'

let connection: signalR.HubConnection | null = null

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5214/api'
  return url.replace(/\/api\/?$/, '')
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null
  const nameEq = 'token='
  for (const cookie of document.cookie.split(';')) {
    const c = cookie.trim()
    if (c.startsWith(nameEq)) return decodeURIComponent(c.slice(nameEq.length))
  }
  return null
}

export function startConnection(): signalR.HubConnection {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection
  }

  if (connection) {
    connection.stop().catch(() => {})
    connection = null
  }

  const baseUrl = getBaseUrl()

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${baseUrl}/hubs/ticket`, {
      accessTokenFactory: () => getToken() ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build()

  connection.onreconnecting(() => {
    console.warn('SignalR: reconnecting...')
  })

  connection.onreconnected(() => {
    console.log('SignalR: reconnected')
  })

  connection.onclose(() => {
    console.log('SignalR: connection closed')
  })

  connection.start().catch(err => {
    console.error('SignalR: connection error:', err)
  })

  return connection
}

export function stopConnection() {
  if (connection) {
    connection.stop().catch(() => {})
    connection = null
  }
}

export function getConnection(): signalR.HubConnection | null {
  return connection
}
