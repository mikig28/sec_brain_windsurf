'use client'

import { useEffect, useState } from 'react'
import { DeleteButton } from './DeleteButton'
import { MessageSquare, Link, Video } from 'lucide-react'

interface Thought {
  id: string
  content: string
  type: string
  created_at: string
}

export function ThoughtsList() {
  const [thoughts, setThoughts] = useState<Thought[]>([])

  const fetchThoughts = async () => {
    const response = await fetch('/api/thoughts')
    const data = await response.json()
    setThoughts(data)
  }

  useEffect(() => {
    fetchThoughts()
  }, [])

  const handleDelete = (deletedId: string) => {
    setThoughts(thoughts.filter(thought => thought.id !== deletedId))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'link':
        return <Link className="h-4 w-4 mr-2" />
      case 'video':
        return <Video className="h-4 w-4 mr-2" />
      default:
        return <MessageSquare className="h-4 w-4 mr-2" />
    }
  }

  return (
    <div className="space-y-4">
      {thoughts.map((thought) => (
        <div 
          key={thought.id} 
          className="flex items-center justify-between p-4 bg-card rounded-lg border hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start space-x-3 flex-grow">
            <div className="flex items-center">
              {getIcon(thought.type)}
            </div>
            <div className="flex-grow">
              <p className="text-sm">{thought.content}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(thought.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <DeleteButton thoughtId={thought.id} onDelete={() => handleDelete(thought.id)} />
        </div>
      ))}
    </div>
  )
} 