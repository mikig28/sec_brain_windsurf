'use client'

import { useEffect, useState } from 'react'
import { Card } from "@/components/ui/card"

type Thought = {
  id: string
  content: string
  type: string
  created_at: string
}

export function ThoughtList({ type }: { type?: string }) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchThoughts = async () => {
      try {
        const response = await fetch('/api/thoughts')
        if (response.ok) {
          const data = await response.json()
          // Filter by type if specified
          const filtered = type 
            ? data.filter((t: Thought) => t.type === type)
            : data
          setThoughts(filtered)
        }
      } catch (error) {
        console.error('Failed to fetch thoughts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchThoughts()
    const interval = setInterval(fetchThoughts, 10000)
    return () => clearInterval(interval)
  }, [type])

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎥'
      case 'link': return '🔗'
      default: return '💭'
    }
  }

  if (loading) {
    return <div className="flex justify-center p-4">Loading...</div>
  }

  if (thoughts.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        No {type || 'thoughts'} found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {thoughts.map((thought) => (
        <Card key={thought.id} className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">{getIcon(thought.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">
                {new Date(thought.created_at).toLocaleString()}
              </p>
              <p className="mt-1 break-words">{thought.content}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
} 