'use client'

import { X } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'

interface DeleteButtonProps {
  thoughtId: string
  onDelete: () => void
}

export function DeleteButton({ thoughtId, onDelete }: DeleteButtonProps) {
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/thoughts/${thoughtId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast({
        title: 'Thought deleted',
        description: 'The thought has been successfully deleted.',
      })
      
      onDelete()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete the thought.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground ml-2 flex-shrink-0 border border-gray-200"
      onClick={handleDelete}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Delete thought</span>
    </Button>
  )
} 