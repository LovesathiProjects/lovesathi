'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { supabase } from '@/lib/supabaseClient'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const useSocketContext = () => useContext(SocketContext)

interface SocketProviderProps {
  children: React.ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeSocket = async () => {
      try {
        // Get current user and session
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session?.access_token) {
          return
        }

        // Socket.io server URL
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
        if (!socketUrl) {
          return
        }

        // Create socket connection with authentication
        const newSocket = io(socketUrl, {
          auth: {
            token: session.access_token,
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        })

        newSocket.on('connect', () => {
          console.log('Socket.io connected')
          if (mounted) {
            setIsConnected(true)
          }
        })

        newSocket.on('disconnect', () => {
          console.log('Socket.io disconnected')
          if (mounted) {
            setIsConnected(false)
          }
        })

        newSocket.on('connect_error', (error) => {
          console.error('Socket.io connection error:', error)
          if (mounted) {
            setIsConnected(false)
          }
        })

        socketRef.current = newSocket
        if (mounted) {
          setSocket(newSocket)
        }
      } catch (error) {
        console.error('Error initializing socket:', error)
      }
    }

    initializeSocket()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Reconnect with new token if not already connected
        if (!socketRef.current?.connected) {
          initializeSocket()
        }
      } else if (event === 'SIGNED_OUT') {
        // Disconnect socket on sign out
        if (socketRef.current) {
          socketRef.current.disconnect()
          socketRef.current = null
          setSocket(null)
          setIsConnected(false)
        }
      }
    })

    return () => {
      mounted = false
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      subscription.unsubscribe()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
