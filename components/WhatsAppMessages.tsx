'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import Link from "next/link"
import { extractYouTubeId } from "@/lib/youtube"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  title: string
  content: string
  type: 'thought' | 'image' | 'video'
  created_at: string
  updated_at: string
  source: string
  status: string
  image_url?: string
  video_id?: string
  url?: string
  tags?: string[]
}

export default function WhatsAppMessages() {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    fetchMessages()

    const entriesChannel = supabase
      .channel('entries-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'entries',
          filter: "source=eq.whatsapp"
        },
        (payload) => {
          console.log('New entry received:', payload.new)
          setMessages(prev => [payload.new as Message, ...prev])
        }
      )
      .subscribe()

    const videosChannel = supabase
      .channel('videos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: "type=eq.image"
        },
        (payload) => {
          console.log('New video/image received:', payload.new)
          const newMessage: Message = {
            id: payload.new.video_id,
            title: 'WhatsApp Image/Video',
            content: '',
            type: payload.new.type || 'video',
            created_at: payload.new.timestamp,
            updated_at: payload.new.timestamp,
            source: 'whatsapp',
            status: 'active',
            image_url: payload.new.image_url,
            video_id: payload.new.video_id,
            url: payload.new.url,
            tags: []
          }
          console.log('Adding new message:', newMessage)
          setMessages(prev => [newMessage, ...prev])
        }
      )
      .subscribe((status) => {
        console.log('Videos channel status:', status)
      })

    return () => {
      entriesChannel.unsubscribe()
      videosChannel.unsubscribe()
    }
  }, [])

  async function fetchMessages() {
    console.log('Fetching messages...')
    const [entriesResult, videosResult] = await Promise.all([
      supabase
        .from('entries')
        .select('*')
        .eq('source', 'whatsapp')
        .order('created_at', { ascending: false }),
      supabase
        .from('videos')
        .select('*')
        .order('timestamp', { ascending: false })
    ]);

    console.log('Entries result:', entriesResult.data)
    console.log('Videos result:', videosResult.data)

    const entries = entriesResult.data || [];
    const videos = (videosResult.data || []).map(video => ({
      id: video.video_id,
      title: 'WhatsApp Image/Video',
      content: '',
      type: video.type || 'video',
      created_at: video.timestamp,
      updated_at: video.timestamp,
      source: 'whatsapp',
      status: 'active',
      image_url: video.image_url,
      video_id: video.video_id,
      url: video.url
    }));

    const allMessages = [...entries, ...videos].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log('Setting all messages:', allMessages)
    setMessages(allMessages);
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (!error) {
      setMessages(prev => prev.filter(msg => msg.id !== id))
    }
  }

  function renderMessageContent(message: Message) {
    console.log('Rendering message type:', message.type, 'with data:', message);
    switch (message.type) {
      case 'image':
        return (
          <div>
            <img 
              src={message.image_url} 
              alt={message.title}
              className="w-full h-auto rounded-md max-h-[400px] object-contain"
              onError={(e) => console.error('Image failed to load:', e)}
              onLoad={() => console.log('Image loaded successfully:', message.image_url)}
            />
            {message.content && (
              <p className="text-[#111B21] dark:text-white break-words mt-1">
                {message.content}
              </p>
            )}
          </div>
        )
      
      case 'video':
        return (
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${message.video_id}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-md"
            />
          </div>
        )
      
      default:
        return (
          <p className="text-[#111B21] dark:text-white break-words">
            {message.content.split(' ').map((word, i) => {
              const youtubeId = extractYouTubeId(word)
              if (youtubeId) {
                return (
                  <Link
                    key={i}
                    href={word}
                    className="text-blue-500 hover:underline"
                    target="_blank"
                  >
                    {word}{' '}
                  </Link>
                )
              }
              return word + ' '
            })}
          </p>
        )
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="max-w-[80%] ml-auto bg-[#D9FDD3] dark:bg-[#005C4B] p-2 rounded-lg shadow relative group"
        >
          <button
            onClick={() => deleteMessage(message.id)}
            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
          </button>

          {renderMessageContent(message)}

          <div className="text-xs text-gray-500 mt-1">
            {format(new Date(message.created_at), 'HH:mm')}
          </div>
        </div>
      ))}
    </div>
  )
} 