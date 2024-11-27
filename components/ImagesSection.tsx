'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import type { Database } from '@/types/database.types'

interface Image {
  id: string
  url: string
  image_url: string
  timestamp: string
  type: 'image'
}

export default function ImagesSection() {
  const [images, setImages] = useState<Image[]>([])
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    fetchImages()

    const channel = supabase
      .channel('images-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: "type=eq.image"
        },
        () => {
          fetchImages()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  async function fetchImages() {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('type', 'image')
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error fetching images:', error)
    } else {
      setImages(data || [])
    }
  }

  async function deleteImage(id: string) {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting image:', error)
    } else {
      setImages(images.filter(img => img.id !== id))
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {images.map((image) => (
        <div 
          key={image.id} 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden relative group"
        >
          <button
            onClick={() => deleteImage(image.id)}
            className="absolute top-2 right-2 z-10 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          <div className="aspect-square relative">
            <img
              src={image.image_url}
              alt="WhatsApp Image"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', image.image_url)
                e.currentTarget.src = '/placeholder-image.png'
              }}
            />
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500">
              {format(new Date(image.timestamp), 'PPpp')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
} 