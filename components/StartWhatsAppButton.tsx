'use client'

import { useState } from 'react'

export default function StartWhatsAppButton() {
  const [isLoading, setIsLoading] = useState(false)

  async function startMonitoring() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/whatsapp', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }
      
      console.log('WhatsApp monitoring started successfully')
    } catch (error) {
      console.error('Failed to start monitoring:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={startMonitoring}
      disabled={isLoading}
      className="px-4 py-2 bg-green-500 text-white rounded flex items-center gap-2 disabled:opacity-50"
    >
      {isLoading ? 'Starting...' : 'Start WhatsApp Monitor'}
    </button>
  )
} 